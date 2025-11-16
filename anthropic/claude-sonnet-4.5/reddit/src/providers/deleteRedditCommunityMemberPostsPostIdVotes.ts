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

export async function deleteRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_post_id: props.postId,
        reddit_community_member_id: props.member.id,
      },
    });

  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }

  const deletedVote = await MyGlobal.prisma.reddit_community_post_votes.delete({
    where: {
      id: existingVote.id,
    },
  });

  return {
    id: deletedVote.id,
    post_id: deletedVote.reddit_community_post_id,
    member_id: deletedVote.reddit_community_member_id,
    vote_type: deletedVote.vote_type as 1 | -1,
    created_at: toISOStringSafe(deletedVote.created_at),
    updated_at: toISOStringSafe(deletedVote.updated_at),
  };
}
