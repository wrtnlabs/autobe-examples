import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        reddit_community_comment_id: props.commentId,
        reddit_community_member_id: props.member.id,
      },
    });

  if (!existingVote) {
    throw new HttpException("Vote not found for this comment", 404);
  }

  await MyGlobal.prisma.reddit_community_comment_votes.delete({
    where: {
      id: existingVote.id,
    },
  });

  return {
    id: existingVote.id,
    reddit_community_comment_id: existingVote.reddit_community_comment_id,
    reddit_community_member_id: existingVote.reddit_community_member_id,
    vote_type: typia.assert<1 | -1>(existingVote.vote_type),
    created_at: toISOStringSafe(existingVote.created_at),
    updated_at: toISOStringSafe(existingVote.updated_at),
  };
}
