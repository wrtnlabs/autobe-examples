import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformMemberEmailVerificationTransformer {
  export type Payload =
    Prisma.community_platform_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        issued_at: true,
        expired_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMemberEmailVerification> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      issued_at: input.issued_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      verified_at: input.verified_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformMemberEmailVerificationTransformer {
//       export type Payload = Prisma.community_platform_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             issued_at: true,
//             expired_at: true,
//             verified_at: true,
//             created_at: true,
//             updated_at: true,
//             member: CommunityPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformMemberEmailVerification> {
//         return {
//   id: {string},
//   member: await CommunityPlatformMemberAtSummaryTransformer.transform(input.member),
//   issued_at: {string},
//   expired_at: {string},
//   verified_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------