import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      content_type: true,
      reddit_clone_post_id: true,
      reddit_clone_comment_id: true,
      reddit_clone_community_id: true,
      reddit_clone_member_id: true,
      reason: true,
      created_at: true,
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 409);
  }
  const newStatus = props.body.status;
  if (
    newStatus === undefined ||
    (newStatus !== "approved" && newStatus !== "dismissed")
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  const now = new Date();
  const snapshotId = v4();
  await MyGlobal.prisma.reddit_clone_reports_snapshots.create({
    data: {
      id: snapshotId,
      reddit_clone_report_id: report.id,
      reddit_clone_member_id: report.reddit_clone_member_id,
      reddit_clone_community_id: report.reddit_clone_community_id,
      reason: report.reason,
      status: report.status,
      target_type: report.content_type,
      target_id:
        report.reddit_clone_post_id ??
        report.reddit_clone_comment_id ??
        snapshotId,
      captured_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: newStatus,
      updated_at: now,
    },
  });
  if (newStatus === "approved") {
    if (report.reddit_clone_post_id) {
      await MyGlobal.prisma.reddit_clone_posts.delete({
        where: { id: report.reddit_clone_post_id },
      });
    } else if (report.reddit_clone_comment_id) {
      await MyGlobal.prisma.reddit_clone_comments.delete({
        where: { id: report.reddit_clone_comment_id },
      });
    }
  }
  const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(updated);
}
