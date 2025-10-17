import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const now = toISOStringSafe(new Date());
  // 1. Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found or deleted", 404);
  }
  // 2. Members cannot vote on their own posts
  if (post.community_platform_member_id === props.member.id) {
    throw new HttpException("Members cannot vote on their own posts", 403);
  }
  // 3. Only allow vote_value of 1 or -1
  if (props.body.vote_value !== 1 && props.body.vote_value !== -1) {
    throw new HttpException("Invalid vote_value: must be 1 or -1", 400);
  }
  // 4. Find existing active vote
  const existing =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: props.postId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (existing) {
    // Update vote value and updated_at
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existing.id },
      data: {
        vote_value: props.body.vote_value,
        updated_at: now,
      },
    });
    return {
      id: updated.id,
      community_platform_post_id: updated.community_platform_post_id,
      community_platform_member_id: updated.community_platform_member_id,
      vote_value: updated.vote_value === 1 ? 1 : -1,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: now,
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  }
  // Create new vote record
  const created = await MyGlobal.prisma.community_platform_post_votes.create({
    data: {
      id: v4(),
      community_platform_post_id: props.postId,
      community_platform_member_id: props.member.id,
      vote_value: props.body.vote_value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    community_platform_post_id: created.community_platform_post_id,
    community_platform_member_id: created.community_platform_member_id,
    vote_value: created.vote_value === 1 ? 1 : -1,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
