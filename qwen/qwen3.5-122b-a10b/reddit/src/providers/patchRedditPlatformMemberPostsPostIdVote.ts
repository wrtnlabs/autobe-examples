import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostVoteTransformer } from "../transformers/RedditPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostVote.IRequest;
}): Promise<IRedditPlatformPostVote> {
  // Step 1: Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true, community_id: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      reddit_platform_community_id: post.community_id,
      reddit_platform_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Step 3: Prevent self-voting
  if (post.author_id === props.member.id) {
    throw new HttpException("You cannot vote on your own post", 403);
  }
  // Step 4: Query existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_post_id: props.postId,
        deleted_at: null,
      },
    });
  let voteRecord;
  // Step 5: Handle vote logic
  if (props.body.type === "remove") {
    if (existingVote === null) {
      throw new HttpException("No vote exists to remove", 400);
    }
    // Delete the vote (soft delete)
    await MyGlobal.prisma.reddit_platform_post_votes.update({
      where: { id: existingVote.id },
      data: { deleted_at: new Date() },
    });
    // Re-fetch to get the soft-deleted record
    voteRecord =
      await MyGlobal.prisma.reddit_platform_post_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
      });
  } else {
    // upvote or downvote
    const now = new Date();
    if (existingVote === null) {
      // Create new vote
      voteRecord = await MyGlobal.prisma.reddit_platform_post_votes.create({
        data: {
          id: v4(),
          reddit_platform_member_id: props.member.id,
          reddit_platform_post_id: props.postId,
          type: props.body.type,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    } else {
      // Update existing vote
      voteRecord = await MyGlobal.prisma.reddit_platform_post_votes.update({
        where: { id: existingVote.id },
        data: {
          type: props.body.type,
          updated_at: now,
        },
      });
    }
  }
  // Step 6: Return transformed vote record
  const payload =
    await MyGlobal.prisma.reddit_platform_post_votes.findUniqueOrThrow({
      where: { id: voteRecord.id },
      ...RedditPlatformPostVoteTransformer.select(),
    });
  return await RedditPlatformPostVoteTransformer.transform(payload);
}
