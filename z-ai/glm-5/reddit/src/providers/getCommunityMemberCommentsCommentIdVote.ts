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

export async function getCommunityMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityCommentVote.IState | null> {
  // 1. Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: { is_deleted: true },
  });
  if (comment === null || comment.is_deleted) {
    throw new HttpException("Comment not found", 404);
  }
  // 2. Look up the vote by member and comment
  const vote = await MyGlobal.prisma.community_comment_votes.findUnique({
    where: {
      community_member_id_community_comment_id: {
        community_member_id: props.member.id,
        community_comment_id: props.commentId,
      },
    },
    ...CommunityCommentVoteAtStateTransformer.select(),
  });
  // 3. Return null if no vote exists
  if (vote === null) {
    return null;
  }
  // 4. Transform and return the vote state
  return CommunityCommentVoteAtStateTransformer.transform(vote);
}
