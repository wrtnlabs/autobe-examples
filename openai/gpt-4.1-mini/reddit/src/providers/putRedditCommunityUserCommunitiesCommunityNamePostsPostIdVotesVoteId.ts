import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserCommunitiesCommunityNamePostsPostIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const { user, voteId, body } = props;

  const vote =
    await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
      where: { id: voteId },
    });

  if (vote.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own votes",
      403,
    );
  }

  const nowISO = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_post_votes.update({
    where: { id: voteId },
    data: {
      vote_type: body.vote_type,
      updated_at: nowISO,
    },
  });

  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    reddit_community_user_id: updated.reddit_community_user_id,
    reddit_community_community_id: updated.reddit_community_community_id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: nowISO,
  };
}
