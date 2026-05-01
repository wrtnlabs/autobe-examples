import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmMemberPasswordResetTransformer {
  export type Payload = Prisma.erp_hrm_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        updated_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IErpHrmMemberPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmMemberPasswordResetTransformer {
//       export type Payload = Prisma.erp_hrm_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             expired_at: true,
//             token: true,
//             updated_at: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmMemberPasswordReset> {
//         return {
//   id: {string},
//   token: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   created_at: {string},
//   expired_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------