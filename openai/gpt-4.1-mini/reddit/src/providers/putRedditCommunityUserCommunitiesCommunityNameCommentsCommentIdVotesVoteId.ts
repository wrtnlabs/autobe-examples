import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserCommunitiesCommunityNameCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const { user, communityName, commentId, voteId, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: { name: communityName },
      select: { id: true },
    });

  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirstOrThrow({
      where: {
        id: voteId,
        reddit_community_comment_id: commentId,
        reddit_community_community_id: community.id,
      },
    });

  if (vote.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own vote",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: voteId },
    data: {
      vote_type: body.vote_type,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    reddit_community_comment_id: updated.reddit_community_comment_id,
    reddit_community_user_id: updated.reddit_community_user_id,
    reddit_community_community_id: updated.reddit_community_community_id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
