import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityAdminAtSummaryTransformer } from "./RedditCommunityAdminAtSummaryTransformer";
import { RedditCommunityReportAtSummaryTransformer } from "./RedditCommunityReportAtSummaryTransformer";

export namespace RedditCommunityReportResolutionTransformer {
  export type Payload = Prisma.reddit_community_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        resolution_type: true,
        status: true,
        resolution_notes: true,
        escalation_reason: true,
        transferred_to_admin_id: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: RedditCommunityAdminAtSummaryTransformer.select(),
        report: RedditCommunityReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReportResolution> {
    if (!input.admin)
      throw new HttpException("admin relationship is null", 400);
    if (!input.report)
      throw new HttpException("report relationship is null", 400);
    const report = await RedditCommunityReportAtSummaryTransformer.transform(
      input.report,
    );
    return {
      id: input.id as string & tags.Format<"uuid">,
      resolution_type: input.resolution_type,
      status: input.status,
      resolution_notes: input.resolution_notes,
      escalation_reason: input.escalation_reason,
      transferred_to_admin_id: input.transferred_to_admin_id,
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      admin: await RedditCommunityAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      report: report,
      targetPost: report.targetPost,
      targetComment: report.targetComment,
    } satisfies IRedditCommunityReportResolution;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityReportResolutionTransformer {
//       export type Payload = Prisma.reddit_community_report_resolutionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             resolution_type: true,
//             status: true,
//             resolution_notes: true,
//             escalation_reason: true,
//             transferred_to_admin_id: true,
//             resolved_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             report: RedditCommunityReportAtSummaryTransformer.select(),
//             admin: RedditCommunityAdminAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_community_report_resolutionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityReportResolution> {
//         return {
//   id: {string},
//   resolution_type: {string},
//   status: {string},
//   resolution_notes: {string | null},
//   escalation_reason: {string | null},
//   transferred_to_admin_id: {string | null},
//   resolved_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   admin: await RedditCommunityAdminAtSummaryTransformer.transform(input.admin),
//   report: await RedditCommunityReportAtSummaryTransformer.transform(input.report),
//   targetPost: {IRedditCommunityPost.ISummary | null},
//   targetComment: {IRedditCommunityComment.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------