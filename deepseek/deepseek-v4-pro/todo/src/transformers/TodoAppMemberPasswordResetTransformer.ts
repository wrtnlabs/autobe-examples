import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberPasswordResetTransformer {
  export type Payload = Prisma.todo_app_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo_app_member_id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset> {
    return {
      id: input.id,
      todo_app_member_id: input.todo_app_member_id,
      token: input.token,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppMemberPasswordResetTransformer {
//       export type Payload = Prisma.todo_app_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expired_at: true,
//             created_at: true,
//             updated_at: true,
//             todo_app_member_id: true,
//           },
//         } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMemberPasswordReset> {
//         return {
//   id: {string},
//   todo_app_member_id: {string},
//   token: {string},
//   expired_at: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------