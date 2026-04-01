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
  // Fetch report with content references
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
      reportOfPost: {
        select: {
          post: { select: { id: true } },
        },
      } satisfies Prisma.reddit_like_report_of_postsFindFirstArgs,
      commentReport: {
        select: {
          comment: { select: { id: true } },
        },
      } satisfies Prisma.reddit_like_report_of_commentsFindFirstArgs,
    },
  });
  // Verify owner has moderation privileges for this community
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: report.community_id },
      select: { owner_id: true },
    });
  const isOwner = community.owner_id === props.owner.id;
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.owner.id,
      community_id: report.community_id,
    },
  });
  if (!isOwner && !moderatorRole) {
    throw new HttpException(
      "Forbidden - Not a moderator of this community",
      403,
    );
  }
  // Verify report is pending
  if (report.status !== "pending") {
    throw new HttpException(`Report is already ${report.status}`, 400);
  }
  // Soft delete reported content
  const now = new Date();
  if (report.reportOfPost) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: report.reportOfPost.post.id },
      data: {
        is_deleted: true,
        deleted_at: now,
        updated_at: now,
      },
    });
  } else if (report.commentReport) {
    await MyGlobal.prisma.reddit_like_comments.update({
      where: { id: report.commentReport.comment.id },
      data: {
        is_deleted: true,
        updated_at: now,
      },
    });
  } else {
    throw new HttpException("Report has no associated content", 400);
  }
  // Update report status to approved
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: now,
    },
  });
  // Fetch updated report with full data and transform
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
