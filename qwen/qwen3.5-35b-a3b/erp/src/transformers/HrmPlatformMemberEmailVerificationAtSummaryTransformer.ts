import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.hrm_platform_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMemberEmailVerification.ISummary> {
    const isVerified = input.used_at !== null;
    const isDeleted = input.deleted_at !== null;
    const isExpired = !isDeleted && input.expires_at < new Date();
    const isPending = !isVerified && !isExpired && !isDeleted;
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      is_pending: isPending,
      is_verified: isVerified,
      is_expired: isExpired,
      is_deleted: isDeleted,
    } satisfies IHrmPlatformMemberEmailVerification.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMemberEmailVerification.ISummary> {
//         return {
//   id: {string},
//   token: {string},
//   expires_at: {string},
//   used_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   is_pending: {boolean},
//   is_verified: {boolean},
//   is_expired: {boolean},
//   is_deleted: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------