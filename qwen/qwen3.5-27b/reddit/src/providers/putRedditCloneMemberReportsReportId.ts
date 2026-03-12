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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      reddit_clone_community_id: true,
      reddit_clone_member_id: true,
      content_type: true,
      reddit_clone_post_id: true,
      reddit_clone_comment_id: true,
      reason: true,
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 409);
  }
  if (
    props.body.status === undefined ||
    !["approved", "dismissed"].includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_members_id: props.member.id,
        reddit_clone_communities_id: report.reddit_clone_community_id,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.status === "approved") {
    if (
      report.content_type === "post" &&
      report.reddit_clone_post_id !== null
    ) {
      await MyGlobal.prisma.reddit_clone_posts.update({
        where: { id: report.reddit_clone_post_id },
        data: { deleted_at: new Date() },
      });
    } else if (
      report.content_type === "comment" &&
      report.reddit_clone_comment_id !== null
    ) {
      await MyGlobal.prisma.reddit_clone_comments.update({
        where: { id: report.reddit_clone_comment_id },
        data: { deleted_at: new Date() },
      });
    }
  }
  await MyGlobal.prisma.reddit_clone_reports_snapshots.create({
    data: {
      id: v4(),
      reddit_clone_report_id: report.id,
      reddit_clone_member_id: report.reddit_clone_member_id,
      reddit_clone_community_id: report.reddit_clone_community_id,
      reason: report.reason,
      status: props.body.status,
      target_type: report.content_type,
      target_id:
        report.content_type === "post"
          ? report.reddit_clone_post_id!
          : report.reddit_clone_comment_id!,
      captured_at: new Date(),
    },
  });
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: report.id },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(updated);
}
