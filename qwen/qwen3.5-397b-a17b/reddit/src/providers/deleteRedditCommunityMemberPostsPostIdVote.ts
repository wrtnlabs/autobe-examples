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

export async function deleteRedditCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the post to verify it exists and is not deleted
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_community_member_id: true,
      reddit_community_community_id: true,
      deleted_at: true,
    },
  });
  // Check if post is deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Check if user is banned from the community
  const ban = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_community_id: post.reddit_community_community_id,
      reddit_community_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Check if user is trying to vote on their own post
  if (post.reddit_community_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // Find the existing vote
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findFirst({
    where: {
      reddit_community_member_id: props.member.id,
      reddit_community_post_id: props.postId,
      deleted_at: null,
    },
  });
  // If no vote exists, return 404
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  // Soft delete the vote
  await MyGlobal.prisma.reddit_community_post_votes.update({
    where: { id: vote.id },
    data: {
      deleted_at: new Date(),
    },
  });
  // Update karma history (inverse of the vote direction)
  const karmaChange = vote.direction === "UPVOTE" ? -1 : 1;
  // Get current karma total for the post author
  const latestKarma =
    await MyGlobal.prisma.reddit_community_user_karma_histories.findFirst({
      where: {
        user_id: post.reddit_community_member_id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  const newTotal = latestKarma
    ? latestKarma.new_total + karmaChange
    : karmaChange;
  // Create karma history record
  await MyGlobal.prisma.reddit_community_user_karma_histories.create({
    data: {
      id: v4(),
      user_id: post.reddit_community_member_id,
      voter_id: props.member.id,
      change_amount: karmaChange,
      new_total: newTotal,
      source_type: "POST",
      source_id: props.postId,
      created_at: new Date(),
    },
  });
}
