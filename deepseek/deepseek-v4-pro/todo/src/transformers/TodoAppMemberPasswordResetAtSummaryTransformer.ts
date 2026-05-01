import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.todo_app_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        expired_at: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      expired: input.expired_at < new Date(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppMemberPasswordResetAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<ITodoAppMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   expired_at: {string},
//   created_at: {string},
//   expired: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------