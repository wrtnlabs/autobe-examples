import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        created_at: true,
        todoAppTodo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory.ISummary> {
    return {
      id: input.id,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todoAppTodo),
      editedAt: input.edited_at.toISOString(),
      title: input.title,
      description: input.description,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies ITodoAppTodoEditHistory.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppTodoEditHistoryAtSummaryTransformer {
//       export type Payload = Prisma.todo_app_todo_edit_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             edited_at: true,
//             title: true,
//             description: true,
//             start_date: true,
//             due_date: true,
//             created_at: true,
//             todoAppTodo: TodoAppTodoAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppTodoEditHistory.ISummary> {
//         return {
//   id: {string},
//   todo: await TodoAppTodoAtSummaryTransformer.transform(input.todoAppTodo),
//   editedAt: {string},
//   title: {string | null},
//   description: {string | null},
//   startDate: {string | null},
//   dueDate: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------