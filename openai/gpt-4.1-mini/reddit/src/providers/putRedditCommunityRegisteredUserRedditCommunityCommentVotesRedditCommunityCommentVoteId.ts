import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityCommentVotesRedditCommunityCommentVoteId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityCommentVoteId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const existing =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: { id: props.redditCommunityCommentVoteId },
    });

  if (!existing) {
    throw new HttpException("Reddit Community comment vote not found", 404);
  }

  if (
    existing.reddit_community_registered_user_id !== props.registeredUser.id
  ) {
    throw new HttpException("You can only update your own vote", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: props.redditCommunityCommentVoteId },
    data: { vote_type: props.body.vote.toString() },
  });

  return {
    id: updated.id,
    reddit_community_comment_id: updated.reddit_community_comment_id,
    reddit_community_registered_user_id:
      updated.reddit_community_registered_user_id,
    vote: Number(updated.vote_type),
    created_at: toISOStringSafe(updated.created_at),
  };
}
