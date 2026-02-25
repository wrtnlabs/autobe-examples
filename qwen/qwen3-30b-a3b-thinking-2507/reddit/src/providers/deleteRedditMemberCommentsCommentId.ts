import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  if (comment.reddit_member_id !== props.member.id) {
    const post = await MyGlobal.prisma.reddit_posts.findUnique({
      where: { id: comment.reddit_post_id },
      select: { reddit_communities_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    const isModerator = await MyGlobal.prisma.reddit_community_bans.findFirst({
      where: {
        community_id: post.reddit_communities_id,
        reddit_member_id: props.member.id,
        role: "moderator",
      },
    });
    if (!isModerator) {
      throw new HttpException(
        "You don't have permission to delete this comment",
        403,
      );
    }
  }
  const votes = await MyGlobal.prisma.reddit_comment_votes.findMany({
    where: { reddit_comment_id: props.commentId },
    select: { vote_direction: true },
  });
  const upvotes = votes.filter((vote) => vote.vote_direction === "up").length;
  const downvotes = votes.length - upvotes;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_comment_votes.deleteMany({
      where: { reddit_comment_id: props.commentId },
    }),
    MyGlobal.prisma.reddit_comments.delete({
      where: { id: props.commentId },
    }),
    MyGlobal.prisma.reddit_posts.update({
      where: { id: comment.reddit_post_id },
      data: { comments_count: { decrement: 1 } },
    }),
  ]);
  if (comment.reddit_member_id === props.member.id) {
    const karmaAdjustment = upvotes - downvotes;
    await MyGlobal.prisma.reddit_profiles.update({
      where: { reddit_member_id: comment.reddit_member_id },
      data: { karma: { increment: karmaAdjustment } },
    });
  }
}
