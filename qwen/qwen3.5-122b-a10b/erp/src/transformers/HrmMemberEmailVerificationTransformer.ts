import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmMemberEmailVerificationTransformer {
  export type Payload = Prisma.hrm_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmMemberEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      member: await HrmMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmMemberEmailVerification;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmMemberEmailVerificationTransformer {
//       export type Payload = Prisma.hrm_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             email: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: HrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmMemberEmailVerification> {
//         return {
//   id: {string},
//   token: {string},
//   email: {string},
//   expires_at: {string},
//   used_at: {string | null},
//   member: await HrmMemberAtSummaryTransformer.transform(input.member),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------