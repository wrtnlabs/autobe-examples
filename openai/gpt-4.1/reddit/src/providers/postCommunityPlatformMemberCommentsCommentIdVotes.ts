import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Ensure comment exists and not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: props.commentId, deleted_at: null },
    select: { id: true, community_platform_member_id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found or deleted", 404);
  }

  // 2. Prevent voting on own comment
  if (comment.community_platform_member_id === props.member.id) {
    throw new HttpException("You cannot vote your own comment", 403);
  }

  // 3. Check for an existing (active) vote
  const existing =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_comment_id: props.commentId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const now = toISOStringSafe(new Date());
  let vote;

  if (existing) {
    vote = await MyGlobal.prisma.community_platform_comment_votes.update({
      where: { id: existing.id },
      data: {
        vote_value: props.body.vote_value,
        updated_at: now,
      },
    });
  } else {
    vote = await MyGlobal.prisma.community_platform_comment_votes.create({
      data: {
        id: v4(),
        community_platform_comment_id: props.commentId,
        community_platform_member_id: props.member.id,
        vote_value: props.body.vote_value,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // Return DTO; omit 'deleted_at' unless explicitly present, handle as optional+nullable
  const result: ICommunityPlatformCommentVote = {
    id: vote.id,
    community_platform_comment_id: vote.community_platform_comment_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: typia.assert<1 | -1>(vote.vote_value),
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    ...(vote.deleted_at !== undefined
      ? {
          deleted_at:
            vote.deleted_at === null ? null : toISOStringSafe(vote.deleted_at),
        }
      : {}),
  };
  return result;
}
