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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerReportsReportIdApprove(props: {
  owner: OwnerPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // Retrieve report with content references
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      reporter_id: true,
      community_id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      reportOfPost: {
        select: {
          reddit_like_post_id: true,
        },
      },
      commentReport: {
        select: {
          comment_id: true,
        },
      },
    },
  });
  // Verify report is pending
  if (report.status !== "pending") {
    throw new HttpException(`Report is already ${report.status}`, 400);
  }
  // Execute approval in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete reported content (post or comment)
    if (report.reportOfPost) {
      await tx.reddit_like_posts.delete({
        where: { id: report.reportOfPost.reddit_like_post_id },
      });
    } else if (report.commentReport) {
      await tx.reddit_like_comments.delete({
        where: { id: report.commentReport.comment_id },
      });
    }
    // Update report status to approved
    await tx.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
    // Create audit snapshot
    await tx.reddit_like_report_snapshots.create({
      data: {
        id: v4(),
        reddit_like_report_id: props.reportId,
        status: "approved",
        created_at: new Date(),
      },
    });
  });
  // Return updated report using transformer
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
