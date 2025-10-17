import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // Verify post exists and is accessible
  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Find existing vote for this (member, post) combination
  const existingVote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      reddit_like_member_id: member.id,
      reddit_like_post_id: postId,
    },
  });

  // Idempotent behavior: if no vote exists, return successfully
  if (!existingVote) {
    return;
  }

  // Delete the vote record (hard delete)
  await MyGlobal.prisma.reddit_like_post_votes.delete({
    where: {
      id: existingVote.id,
    },
  });
}
