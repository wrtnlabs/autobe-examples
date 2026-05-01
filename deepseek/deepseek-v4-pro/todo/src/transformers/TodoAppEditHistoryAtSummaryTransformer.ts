import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todosFindManyArgs,
      },
    } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppEditHistory.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
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
//             title: true,
//             description: true,
//             start_date: true,
//             due_date: true,
//             created_at: true,
//             updated_at: true,
//             todo_app_todo_id: true,
//           },
//         } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppEditHistory.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   start_date: {string | null},
//   due_date: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------