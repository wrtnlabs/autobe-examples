import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentReportCollector } from "../collectors/RedditCloneContentReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentReportTransformer } from "../transformers/RedditCloneContentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommentsCommentIdReport(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneContentReport.ICreate;
}): Promise<IRedditCloneContentReport> {
  // Validate report_type and comment_id match expectations
  if (props.body.report_type !== "comment") {
    throw new HttpException("Report type must be comment", 400);
  }
  if (props.body.comment_id !== props.commentId) {
    throw new HttpException("Comment ID mismatch", 400);
  }
  // Load target comment
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUnique({
      where: { id: props.commentId },
      select: { id: true, member_id: true },
    });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Prevent self-report
  if (comment.member_id === props.member.id) {
    throw new HttpException("Cannot report your own comment", 403);
  }
  // Check for duplicate report
  const existing =
    await MyGlobal.prisma.reddit_clone_content_reports.findUnique({
      where: {
        reporter_id_comment_id_report_type: {
          reporter_id: props.member.id,
          comment_id: props.commentId,
          report_type: "comment",
        },
      },
    });
  if (existing) {
    throw new HttpException("Duplicate report", 409);
  }
  // Create report
  const created = await MyGlobal.prisma.reddit_clone_content_reports.create({
    data: await RedditCloneContentReportCollector.collect({
      body: props.body,
      redditCloneMembers: props.member,
    }),
    ...RedditCloneContentReportTransformer.select(),
  });
  return await RedditCloneContentReportTransformer.transform(created);
}
