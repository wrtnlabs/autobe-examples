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
  // Verify report exists, is pending, and moderator has privileges for the community
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.reportId,
      status: "pending",
      community: {
        moderators: {
          some: {
            member_id: props.moderator.id,
            deleted_at: null,
          },
        },
      },
    },
    ...RedditLikeReportTransformer.select(),
  });
  if (report === null) {
    throw new HttpException(
      "Report not found or you don't have permission to approve it",
      404,
    );
  }
  // Execute content deletion and status update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete reported content based on polymorphic type
    if (report.reportOfPost) {
      await tx.reddit_like_posts.delete({
        where: { id: report.reportOfPost.post.id },
      });
    } else if (report.commentReport) {
      await tx.reddit_like_comments.delete({
        where: { id: report.commentReport.comment.id },
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
  });
  // Fetch and return updated report with approved status
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
