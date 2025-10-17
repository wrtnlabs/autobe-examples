import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberCommentsCommentIdCommentVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const { member, commentId, body } = props;

  if (body.member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: member_id does not match authenticated member",
      403,
    );
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const vote = await MyGlobal.prisma.reddit_community_comment_votes.upsert({
    where: {
      member_id_comment_id: {
        member_id: member.id,
        comment_id: commentId,
      },
    },
    update: {
      vote_value: body.vote_value,
      updated_at: now,
      deleted_at: null,
    },
    create: {
      id: v4(),
      member_id: member.id,
      comment_id: commentId,
      vote_value: body.vote_value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: vote.id,
    member_id: vote.member_id,
    comment_id: vote.comment_id,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at:
      vote.deleted_at === null ? null : toISOStringSafe(vote.deleted_at),
  };
}
