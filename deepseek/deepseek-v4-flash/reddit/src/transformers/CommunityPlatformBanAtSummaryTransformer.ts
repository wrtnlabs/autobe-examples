import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformBanAtSummaryTransformer {
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
        community: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
        bannedMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        bannedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      bannedMember: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      bannedBy: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformBanAtSummaryTransformer {
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
//             community_platform_community_id: true,
//             community_platform_member_id: true,
//             community_platform_member_banned_by_id: true,
//             ...
//           },
//         } satisfies Prisma.community_platform_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformBan.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   bannedMember: {ICommunityPlatformMember.ISummary},
//   bannedBy: {ICommunityPlatformMember.ISummary},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------