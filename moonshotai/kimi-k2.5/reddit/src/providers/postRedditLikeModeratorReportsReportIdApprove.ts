import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // First, get the report to check community and status
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  // Verify moderator has privileges for this community
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: report.community_id,
      deleted_at: null,
    },
  });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify report is in pending status
  if (report.status !== "pending") {
    throw new HttpException(`Report is already ${report.status}`, 400);
  }
  // Execute approval in transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Get the report with its content reference
    const reportWithContent =
      await prisma.reddit_like_reports.findUniqueOrThrow({
        where: { id: props.reportId },
        select: {
          reportOfPost: {
            select: {
              post: {
                select: { id: true },
              },
            },
          },
          commentReport: {
            select: {
              comment: {
                select: { id: true },
              },
            },
          },
        },
      });
    // Delete the reported content (soft delete)
    if (reportWithContent.reportOfPost !== null) {
      await prisma.reddit_like_posts.update({
        where: { id: reportWithContent.reportOfPost.post.id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else if (reportWithContent.commentReport !== null) {
      await prisma.reddit_like_comments.update({
        where: { id: reportWithContent.commentReport.comment.id },
        data: {
          is_deleted: true,
          updated_at: new Date(),
        },
      });
    }
    // Update report status to approved
    await prisma.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
  });
  // Return the updated report using transformer
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
