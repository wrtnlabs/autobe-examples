import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminReports(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport> {
  const {
    status,
    target_type,
    comment_id,
    reason,
    created_at_start,
    created_at_end,
    sortBy,
    page,
    limit,
  } = props.body;
  const skip = (page - 1) * limit;
  const orderBy =
    sortBy === "newest"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };
  const whereInput = {
    status,
    ...(comment_id && { comment_id }),
    ...(reason && { reason: { contains: reason } }),
    ...(created_at_start && { created_at: { gte: created_at_start } }),
    ...(created_at_end && { created_at: { lte: created_at_end } }),
  } satisfies Prisma.reddit_community_comment_reportsWhereInput;
  const reports =
    await MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    });
  const reporterIds = reports.map((r) => r.reporter_id);
  const reporters = await MyGlobal.prisma.reddit_community_members.findMany({
    where: { id: { in: reporterIds } },
    select: { id: true, display_name: true },
  });
  const reporterMap = new Map(reporters.map((r) => [r.id, r.display_name]));
  // Get all unique comment_ids from reports
  const commentIds = reports.map((r) => r.comment_id);
  // Find which reports target a post (via moderation_action_of_posts)
  const postCommentIds = new Set<string>();
  if (commentIds.length > 0) {
    const modActionsOfPosts =
      await MyGlobal.prisma.reddit_community_moderation_action_of_posts.findMany(
        {
          where: {
            moderation_action_id: { in: commentIds },
          },
          select: { moderation_action_id: true },
        },
      );
    if (modActionsOfPosts.length > 0) {
      const modActionIds = modActionsOfPosts.map(
        (pa) => pa.moderation_action_id,
      );
      const modActions =
        await MyGlobal.prisma.reddit_community_moderation_actions.findMany({
          where: {
            id: { in: modActionIds },
            target_type: "post",
          },
          select: { id: true },
        });
      const postModActionIds = new Set(modActions.map((ma) => ma.id));
      for (const modAct of modActionsOfPosts) {
        if (postModActionIds.has(modAct.moderation_action_id)) {
          // Find corresponding comment_id by joining with original reports
          const targetReport = reports.find(
            (r) => r.comment_id === modAct.moderation_action_id,
          );
          if (targetReport) postCommentIds.add(targetReport.comment_id);
        }
      }
    }
  }
  const statusMap: Record<string, IRedditCommunityCommentReport["status"]> = {
    pending: "pending",
    approved: "approved",
    dismissed: "dismissed",
  };
  const transformed = reports.map((report) => ({
    id: report.id,
    comment_id: report.comment_id,
    reporter_id: report.reporter_id,
    reason: report.reason,
    status: statusMap[report.status] || "pending",
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
    reporter_display_name: reporterMap.get(report.reporter_id) || "Unknown",
    target_type: postCommentIds.has(report.comment_id) ? "post" : "comment",
  }));
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where: whereInput,
  });
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
