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

export async function postRedditLikeModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // Find the report with community relation
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  // Verify moderator is authorized for this community
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: report.community_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (moderatorRole === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Verify report is pending
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  const now = new Date();
  const snapshotId = v4() as string & tags.Format<"uuid">;
  // Create snapshot for audit trail
  await MyGlobal.prisma.reddit_like_report_snapshots.create({
    data: {
      id: snapshotId,
      reddit_like_report_id: report.id,
      status: "dismissed",
      created_at: now,
    },
  });
  // Update report status to dismissed
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: now,
    },
  });
  // Fetch full report with all relations for transformation
  const updated = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(updated);
}
