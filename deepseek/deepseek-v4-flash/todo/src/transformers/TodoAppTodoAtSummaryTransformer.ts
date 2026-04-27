import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        start_date: true,
        due_date: true,
        completed_at: true,
        deleted_at: true,
        created_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      completedAt: input.completed_at?.toISOString() ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    } satisfies ITodoAppTodo.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppTodoAtSummaryTransformer {
//       export type Payload = Prisma.todo_app_todosGetPayload<ReturnType<typeof select>>;
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
//             completed_at: true,
//             deleted_at: true,
//             created_at: true,
//             updated_at: true,
//             member: TodoAppMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.todo_app_todosFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppTodo.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   completedAt: {string | null},
//   startDate: {string | null},
//   dueDate: {string | null},
//   createdAt: {string},
//   deletedAt: {string | null},
//   member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------