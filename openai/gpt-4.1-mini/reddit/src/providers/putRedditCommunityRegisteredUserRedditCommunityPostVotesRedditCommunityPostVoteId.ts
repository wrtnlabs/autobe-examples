import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityPostVotesRedditCommunityPostVoteId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityPostVoteId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findUnique({
      where: { id: props.redditCommunityPostVoteId },
    });

  if (!existingVote) {
    throw new HttpException("Post vote not found", 404);
  }

  if (
    existingVote.reddit_community_registered_user_id !== props.registeredUser.id
  ) {
    throw new HttpException("Forbidden to update others' votes", 403);
  }

  await MyGlobal.prisma.reddit_community_post_votes.update({
    where: { id: props.redditCommunityPostVoteId },
    data: {
      vote_type: props.body.vote_value.toString(),
    },
  });

  const updated = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: props.redditCommunityPostVoteId },
    select: {
      id: true,
      reddit_community_registered_user_id: true,
      reddit_community_post_id: true,
      vote_type: true,
      created_at: true,
    },
  });

  if (!updated) {
    throw new HttpException("Post vote not found after update", 404);
  }

  return {
    id: updated.id,
    redditCommunityRegisteredUserId:
      updated.reddit_community_registered_user_id,
    redditCommunityPostId: updated.reddit_community_post_id,
    vote: updated.vote_type === "1" ? 1 : -1,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.created_at),
  };
}
