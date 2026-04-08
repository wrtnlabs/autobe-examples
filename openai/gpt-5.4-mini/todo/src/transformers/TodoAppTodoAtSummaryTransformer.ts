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

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        is_completed: true,
        start_date: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
        todoEditHistories: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      member: {} as ITodoAppMember.ISummary,
      isCompleted: input.is_completed,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
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
//             is_completed: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             todo_app_member_id: true,
//             ...
//           },
//         } satisfies Prisma.todo_app_todosFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppTodo.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   member: {ITodoAppMember.ISummary},
//   isCompleted: {boolean},
//   startDate: {string | null},
//   dueDate: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------