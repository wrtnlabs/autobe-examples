import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmMemberEmailVerificationTransformer {
  export type Payload = Prisma.erp_hrm_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      expires_at: input.expires_at.toISOString(),
      verified_at: input.verified_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IErpHrmMemberEmailVerification;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmMemberEmailVerificationTransformer {
//       export type Payload = Prisma.erp_hrm_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             email: true,
//             expires_at: true,
//             verified_at: true,
//             created_at: true,
//             updated_at: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmMemberEmailVerification> {
//         return {
//   id: {string},
//   token: {string},
//   email: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   expires_at: {string},
//   verified_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------