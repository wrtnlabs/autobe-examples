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

export async function getRedditCommunityMemberCommentsCommentIdReportsReportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  if (report.comment.id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        reddit_community_post_id: true,
      },
    });
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: comment.reddit_community_post_id },
    select: {
      reddit_community_community_id: true,
    },
  });
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: post.reddit_community_community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityCommentReportTransformer.transform(report);
}
