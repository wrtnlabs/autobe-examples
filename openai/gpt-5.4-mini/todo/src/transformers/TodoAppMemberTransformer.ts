import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppProfileTransformer } from "./TodoAppProfileTransformer";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppMemberTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<ITodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      profile: await TodoAppProfileTransformer.transform(input.profile!),
      todos: await ArrayUtil.asyncMap(
        input.todos,
        TodoAppTodoAtSummaryTransformer.transform,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
    } satisfies ITodoAppMember;
  }
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: TodoAppProfileTransformer.select(),
        todos: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppMemberTransformer {
//       export type Payload = Prisma.todo_app_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.todo_app_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMember> {
//         return {
//   id: {string},
//   email: {string},
//   profile: {ITodoAppProfile},
//   todos: {Array<ITodoAppTodo.ISummary>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------