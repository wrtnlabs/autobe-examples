import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        reason: true,
        status: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        reportedBy: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        resolvedBy: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        onPost: true,
        reportOnComment: true,
      },
    } satisfies Prisma.reddit_like_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityReport.ISummary> {
    return {
      id: input.id,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      reportedBy: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.reportedBy,
      ),
      resolvedBy:
        input.resolvedBy === null
          ? null
          : await REdditLikeCommunityMemberAtSummaryTransformer.transform(
              input.resolvedBy,
            ),
      target_type: input.target_type,
      reason: input.reason,
      status: input.status,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityReportAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             reason: true,
//             status: true,
//             resolved_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             reported_by_member_id: true,
//             resolved_by_member_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityReport.ISummary> {
//         return {
//   id: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   reportedBy: {IREdditLikeCommunityMember.ISummary},
//   resolvedBy: {IREdditLikeCommunityMember.ISummary | null},
//   target_type: {string},
//   reason: {string},
//   status: {string},
//   resolved_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------