import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityReportOnCommentTransformer } from "./REdditLikeCommunityReportOnCommentTransformer";
import { REdditLikeCommunityReportOnPostTransformer } from "./REdditLikeCommunityReportOnPostTransformer";

export namespace REdditLikeCommunityReportTransformer {
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
        onPost: REdditLikeCommunityReportOnPostTransformer.select(),
        reportOnComment: REdditLikeCommunityReportOnCommentTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityReport> {
    return {
      id: input.id,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      reportedBy: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.reportedBy,
      ),
      resolvedBy: input.resolvedBy
        ? await REdditLikeCommunityMemberAtSummaryTransformer.transform(
            input.resolvedBy,
          )
        : null,
      target_type: input.target_type as "post" | "comment",
      status: input.status as "pending" | "approved" | "dismissed",
      reason: input.reason,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      onPost: input.onPost
        ? await REdditLikeCommunityReportOnPostTransformer.transform(
            input.onPost,
          )
        : null,
      reportOnComment: input.reportOnComment
        ? await REdditLikeCommunityReportOnCommentTransformer.transform(
            input.reportOnComment,
          )
        : null,
    } satisfies IREdditLikeCommunityReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityReportTransformer {
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
//             onPost: REdditLikeCommunityReportOnPostTransformer.select(),
//             reportOnComment: REdditLikeCommunityReportOnCommentTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityReport> {
//         return {
//   id: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   reportedBy: {IREdditLikeCommunityMember.ISummary},
//   resolvedBy: {IREdditLikeCommunityMember.ISummary | null},
//   target_type: {"post" | "comment"},
//   status: {"pending" | "approved" | "dismissed"},
//   reason: {string},
//   resolved_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   onPost: input.onPost ? await REdditLikeCommunityReportOnPostTransformer.transform(input.onPost) : null,
//   reportOnComment: input.reportOnComment ? await REdditLikeCommunityReportOnCommentTransformer.transform(input.reportOnComment) : null,
//         };
//       }
//     }
//--------------------------------------------------------------