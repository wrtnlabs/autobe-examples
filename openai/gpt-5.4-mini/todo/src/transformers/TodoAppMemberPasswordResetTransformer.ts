import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset> {
    return {
      id: input.id,
      todoAppMemberId: input.todo_app_member_id,
      token: input.token,
      expiredAt: input.expired_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: {} satisfies ITodoAppMember.ISummary,
    } satisfies ITodoAppMemberPasswordReset;
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
//             deleted_at: true,
//             todo_app_member_id: true,
//             ...
//           },
//         } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMemberPasswordReset> {
//         return {
//   id: {string},
//   todoAppMemberId: {string},
//   token: {string},
//   expiredAt: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   member: {ITodoAppMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------