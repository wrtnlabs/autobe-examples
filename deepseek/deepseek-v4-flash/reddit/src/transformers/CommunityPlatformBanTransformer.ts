import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export namespace CommunityPlatformBanTransformer {
  export type Payload = Prisma.community_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        bannedMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        bannedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedMember: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      bannedBy: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformBanTransformer {
//       export type Payload = Prisma.community_platform_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//             community_platform_member_id: true,
//             community_platform_member_banned_by_id: true,
//             ...
//           },
//         } satisfies Prisma.community_platform_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformBan> {
//         return {
//   id: {string},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   bannedMember: {ICommunityPlatformMember.ISummary},
//   bannedBy: {ICommunityPlatformMember.ISummary},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------