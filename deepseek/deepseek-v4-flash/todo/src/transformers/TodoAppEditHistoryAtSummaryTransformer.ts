import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppEditHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    } satisfies ITodoAppEditHistory.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppEditHistoryAtSummaryTransformer {
//       export type Payload = Prisma.todo_app_edit_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             title: true,
//             description: true,
//             start_date: true,
//             due_date: true,
//             todo: TodoAppTodoAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppEditHistory.ISummary> {
//         return {
//   id: {string},
//   created_at: {string},
//   title: {string | null},
//   description: {string | null},
//   start_date: {string | null},
//   due_date: {string | null},
//   todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
//         };
//       }
//     }
//--------------------------------------------------------------