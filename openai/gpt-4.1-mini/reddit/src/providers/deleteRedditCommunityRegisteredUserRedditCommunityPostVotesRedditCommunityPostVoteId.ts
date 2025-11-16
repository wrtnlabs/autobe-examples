import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityPostVotesRedditCommunityPostVoteId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityPostVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: props.redditCommunityPostVoteId },
  });

  if (vote === null) {
    throw new HttpException("Post vote not found", 404);
  }

  if (vote.reddit_community_registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_post_votes.delete({
    where: { id: props.redditCommunityPostVoteId },
  });
}
