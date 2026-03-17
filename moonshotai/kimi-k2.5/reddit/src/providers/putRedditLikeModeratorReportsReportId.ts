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

export async function putRedditLikeModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IUpdate;
}): Promise<IRedditLikeReport> {
  // Fetch report to verify existence and get community context
  const report = await MyGlobal.prisma.reddit_like_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
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
  // Validate status transition - only from 'pending' to 'approved' or 'dismissed'
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 409);
  }
  const newStatus = props.body.status;
  if (newStatus !== "approved" && newStatus !== "dismissed") {
    throw new HttpException("Invalid status value", 400);
  }
  // Update the report status
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
  });
  // Create snapshot record for audit trail
  await MyGlobal.prisma.reddit_like_report_snapshots.create({
    data: {
      id: v4(),
      reddit_like_report_id: props.reportId,
      status: newStatus,
      created_at: new Date(),
    },
  });
  // Fetch and return the updated report with all relations
  const updated = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditLikeReportTransformer.select(),
  });
  return RedditLikeReportTransformer.transform(updated);
}
