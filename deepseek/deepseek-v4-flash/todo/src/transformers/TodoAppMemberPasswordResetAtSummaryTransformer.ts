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
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.todo_app_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      code: input.code,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    } satisfies ITodoAppMemberPasswordReset.ISummary;
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
//             code: true,
//             expired_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: TodoAppMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   code: {string},
//   expired_at: {string},
//   created_at: {string},
//   deleted_at: {string | null},
//   member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------