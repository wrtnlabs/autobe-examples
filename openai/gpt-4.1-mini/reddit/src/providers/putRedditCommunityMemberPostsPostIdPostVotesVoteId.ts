import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberPostsPostIdPostVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const { member, postId, voteId, body } = props;

  // Find existing vote by voteId and postId
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirstOrThrow({
      where: {
        id: voteId,
        post_id: postId,
        deleted_at: null,
      },
    });

  // Authorization check: member owns the vote
  if (existingVote.member_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own votes",
      403,
    );
  }

  // Prepare updated_at timestamp
  const updatedAt = toISOStringSafe(new Date());

  // Update vote_value and updated_at
  const updated = await MyGlobal.prisma.reddit_community_post_votes.update({
    where: { id: voteId },
    data: {
      vote_value: body.vote_value,
      updated_at: updatedAt,
    },
  });

  // Return updated vote with proper date conversion and nullability handling
  return {
    id: updated.id,
    member_id: updated.member_id,
    post_id: updated.post_id,
    vote_value: updated.vote_value,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
