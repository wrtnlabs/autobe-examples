import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostVoteCollector } from "../collectors/CommunityPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostVoteTransformer } from "../transformers/CommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPostVote.ICreate;
}): Promise<ICommunityPostVote> {
  // Extract vote_type and post_id from body despite ICreate being empty
  const voteType = (props.body as any).vote_type;
  const postId = (props.body as any).post_id;
  // Validate required fields
  if (!voteType) {
    throw new HttpException("vote_type is required", 400);
  }
  if (voteType !== "upvote" && voteType !== "downvote") {
    throw new HttpException(
      'Invalid vote_type. Must be "upvote" or "downvote".',
      400,
    );
  }
  if (!postId) {
    throw new HttpException("post_id is required", 400);
  }
  // Validate UUID format
  if (!typia.is<string & tags.Format<"uuid">>(postId)) {
    throw new HttpException("post_id must be a valid UUID", 400);
  }
  // Check if post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Cannot vote on a deleted post", 404);
  }
  // Check for existing vote by this member on this post
  const existingVote = await MyGlobal.prisma.community_post_votes.findFirst({
    where: {
      member_id: props.member.id,
      post_id: postId,
      deleted_at: null,
    },
  });
  // If existing vote found, delete it first (implement vote flip)
  if (existingVote) {
    await MyGlobal.prisma.community_post_votes.update({
      where: { id: existingVote.id },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
  }
  // Create new vote using collector
  const created = await MyGlobal.prisma.community_post_votes.create({
    data: await CommunityPostVoteCollector.collect({
      body: props.body,
      communityMembers: { id: props.member.id },
      communityPosts: { id: postId },
    }),
    ...CommunityPostVoteTransformer.select(),
  });
  return await CommunityPostVoteTransformer.transform(created);
}
