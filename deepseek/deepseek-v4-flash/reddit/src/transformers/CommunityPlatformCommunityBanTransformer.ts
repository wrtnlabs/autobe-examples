import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityBanTransformer {
  export type Payload = Prisma.community_platform_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        bannedMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        bannedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBan> {
    return {
      id: input.id,
      reason: input.reason,
      expired_at: input.expired_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      bannedMember: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      bannedBy: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies ICommunityPlatformCommunityBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityBanTransformer {
//       export type Payload = Prisma.community_platform_community_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//             community_platform_member_id: true,
//             community_platform_moderator_id: true,
//             ...
//           },
//         } satisfies Prisma.community_platform_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunityBan> {
//         return {
//   id: {string},
//   reason: {string},
//   expired_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   bannedMember: {ICommunityPlatformMember.ISummary},
//   bannedBy: {ICommunityPlatformMember.ISummary},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------