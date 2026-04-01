import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberCommentsCommentIdReportsReportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.IUpdate;
}): Promise<IRedditCommunityCommentReport> {
  // 1. Verify report exists and targets the correct comment
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        reddit_community_comment_id: true,
        status: true,
        deleted_at: true,
      },
    });
  // 2. Verify report targets the specified comment
  if (report.reddit_community_comment_id !== props.commentId) {
    throw new HttpException("Report does not match the specified comment", 400);
  }
  // 3. Verify report is in PENDING state
  if (report.status !== "PENDING") {
    throw new HttpException(
      "Report status can only be updated when PENDING",
      400,
    );
  }
  // 4. Validate status is provided in request body
  if (!props.body.status) {
    throw new HttpException("Status is required", 400);
  }
  // 5. Validate status value
  if (props.body.status !== "APPROVED" && props.body.status !== "DISMISSED") {
    throw new HttpException("Status must be APPROVED or DISMISSED", 400);
  }
  // 6. Get comment to find which post it belongs to
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        reddit_community_post_id: true,
      },
    });
  // 7. Get post to find which community it belongs to
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: comment.reddit_community_post_id },
    select: {
      reddit_community_community_id: true,
    },
  });
  // 8. Verify member is a moderator of the community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: post.reddit_community_community_id,
        member_id: props.member.id,
        deleted_at: null,
      } satisfies Prisma.reddit_community_moderatorsWhereInput,
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // 9. If status is APPROVED, soft-delete the reported comment
  if (props.body.status === "APPROVED") {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });
  }
  // 10. Update the report status and timestamp
  await MyGlobal.prisma.reddit_community_comment_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // 11. Fetch and return the updated report
  const updatedReport =
    await MyGlobal.prisma.reddit_community_comment_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  return await RedditCommunityCommentReportTransformer.transform(updatedReport);
}
