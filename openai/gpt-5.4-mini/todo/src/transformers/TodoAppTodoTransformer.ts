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

export namespace TodoAppTodoTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      isCompleted: input.is_completed,
      member: {
        id: input.member.id,
      } as ITodoAppMember.ISummary,
      todoEditHistories: input.todoEditHistories.length > 0,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies ITodoAppTodo;
  }
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
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
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppTodoTransformer {
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
//       export async function transform(input: Payload): Promise<ITodoAppTodo> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   startDate: {string | null},
//   dueDate: {string | null},
//   isCompleted: {boolean},
//   member: {ITodoAppMember.ISummary},
//   todoEditHistories: {boolean},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------