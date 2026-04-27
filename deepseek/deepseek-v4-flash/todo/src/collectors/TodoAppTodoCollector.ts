import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoCollector {
  export async function collect(props: {
    body: ITodoAppTodo.ICreate;
    todoAppMembers: IEntity;
    todoAppMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      completed_at: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.todoAppMembers.id } },
      editHistories: undefined,
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace TodoAppTodoCollector {
//         export async function collect(props: {
//           body: ITodoAppTodo.ICreate;
//           todoAppMembers: IEntity; // from authorized actor
// todoAppMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       description: ...,
//       start_date: ...,
//       due_date: ...,
//       completed_at: ...,
//       deleted_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       editHistories: ...,
//           } satisfies Prisma.todo_app_todosCreateInput;
//         }
//       }
//--------------------------------------------------------------