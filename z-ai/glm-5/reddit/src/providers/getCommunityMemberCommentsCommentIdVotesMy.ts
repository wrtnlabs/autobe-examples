import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentVoteAtStateTransformer } from "../transformers/CommunityCommentVoteAtStateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberCommentsCommentIdVotesMy(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<ICommunityCommentVote.IMy> {
  // 1. Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      is_deleted: true,
      post: {
        select: {
          community_id: true,
        },
      },
    },
  });
  if (comment.is_deleted) {
    throw new HttpException("Comment not found", 404);
  }
  // 2. Check if user is banned from the community
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      community_id_member_id: {
        community_id: comment.post.community_id,
        member_id: props.member.id,
      },
    },
  });
  if (ban) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Query vote state using transformer
  const vote = await MyGlobal.prisma.community_comment_votes.findUnique({
    where: {
      community_member_id_community_comment_id: {
        community_member_id: props.member.id,
        community_comment_id: props.commentId,
      },
    },
    ...CommunityCommentVoteAtStateTransformer.select(),
  });
  // 4. Return vote state (null values if no vote exists)
  if (vote === null) {
    return {
      direction: null,
      updatedAt: null,
    } satisfies ICommunityCommentVote.IMy;
  }
  return (await CommunityCommentVoteAtStateTransformer.transform(
    vote,
  )) satisfies ICommunityCommentVote.IMy;
}
