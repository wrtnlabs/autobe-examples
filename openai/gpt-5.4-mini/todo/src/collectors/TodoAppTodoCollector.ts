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
    member: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      is_completed: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: { id: props.member.id },
      },
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
//       is_completed: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       todoEditHistories: ...,
//           } satisfies Prisma.todo_app_todosCreateInput;
//         }
//       }
//--------------------------------------------------------------