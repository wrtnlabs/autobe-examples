import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      completed_at: input.completed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
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
//             completed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member_id: true,
//           },
//         } satisfies Prisma.todo_app_todosFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppTodo> {
//         return {
//   id: {string},
//   title: {string},
//   description: {string | null},
//   start_date: {string | null},
//   due_date: {string | null},
//   completed_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------