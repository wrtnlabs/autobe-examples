import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoEditHistoryTransformer {
  export type Payload = Prisma.todo_app_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo_app_todo_id: true,
        edited_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory> {
    return {
      id: input.id,
      todo_app_todo_id: input.todo_app_todo_id,
      edited_at: input.edited_at.toISOString(),
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies ITodoAppTodoEditHistory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppTodoEditHistoryTransformer {
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
//             todo_app_todo_id: true,
//           },
//         } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppTodoEditHistory> {
//         return {
//   id: {string},
//   todo_app_todo_id: {string},
//   edited_at: {string},
//   title: {string | null},
//   description: {string | null},
//   start_date: {string | null},
//   due_date: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------