import $parse from '../expression-parser/parse';
import { ExprFn } from '../types';
import { Directive, Component } from '../core/metadata/directive';
import _ from 'util/util';

// 类似于以前的watcher
const initWatchVal = () => {};
class Binding {
	readonly expression: string;
	newValue: any;
	oldValue: any;

	constructor(
		readonly targetProp: string,
		readonly watchFn: ExprFn,
		readonly target: any | HTMLElement
	){
		this.expression = watchFn.expression || '';
	}

  check(context: any, locals: any): void {
  	if(!_.isObject(context)) return;

		const target: any = this.target;

		try{
			const newValue = this.watchFn(context, locals);

			// TODO 这里这种做法效率非常的低	
			if(!_.isObject(newValue) && newValue === this.oldValue) return;
			target[this.targetProp] = this.oldValue = newValue;
		}catch(e){
			// throw new Error(`Error in ${this.expr.line}:${this.expr.col}:${e.message}`);
			console.error(`表达式: ${ this.expression } 求值出错: ${ e }`);
		}
  }
}

class View {
	private static _debug: boolean = false;
	root: View = this;
	_hostElement: HTMLElement;

	private _afterDetectChangesTaskQueue: Function[] = [];
	bindings: Binding[] = [];
	_children: View[] = [];

	parent: View;
	prevSibling: View;
	nextSibling: View;
	childHead: View;
	childTail: View;

	constructor(
		public _context: any,
		public _locals: any = {}
	){ }

	get context(): any {
		return this._context;
	}

	get locals(): any {
		return this._locals;
	}

	addChild(child: View, index?: number): void {
		if(_.isNil(index) || index > this._children.length) index = this._children.length;		

		// 递归遍历child的所有子孙重置root, 这不是一个好实现, 但是能解决问题, 暂时先这样
		setRootOfView(child, this.root);
		_.arrayInsert(this._children, index, child);
		child.locals.__proto__ = this.locals;
	}

	bind(binding: Binding): Function {
		const view = this;
		this.bindings.push(binding);

		return () => {
			const bindings = view.bindings;
			const index = bindings.indexOf(binding);
			if(-1 === index) return;
			view.bindings = bindings.slice(0, index).concat(bindings.slice(index + 1));
		}
	}

  detectChanges(){
  	if(View._debug)
  	{
	  	console.log(`detectChanges: ${ this }`);
  	}

  	_.forEach(this.bindings, (binding: Binding) => {
  		binding.check(this.context, this.locals);
  	});

  	_.forEach(this._children, childView => { 
  		childView.detectChanges();
  	});

  	const taskQueue = this._afterDetectChangesTaskQueue;
  	while(taskQueue.length) (<any>taskQueue.shift())();
  }

  addAfterDetectChangesTask(fn: Function){ 
  	this._afterDetectChangesTaskQueue.push(fn);
  }

  // TODO 不完善
  destroy(){
  	const parentElement = this._hostElement.parentElement;
  	if(parentElement) parentElement.removeChild(this._hostElement);
  }
}

function setRootOfView(view: View, root: View){
	view.root = root;
	_.forEach(view._children, childView => {
		setRootOfView(childView, root);
	});	
}

export { View, Binding };
