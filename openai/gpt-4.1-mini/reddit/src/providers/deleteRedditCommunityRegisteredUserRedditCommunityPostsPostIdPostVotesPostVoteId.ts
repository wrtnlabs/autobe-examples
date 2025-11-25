import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityPostsPostIdPostVotesPostVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: props.postVoteId },
  });

  if (!vote) {
    throw new HttpException("Post vote not found", 404);
  }

  if (vote.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Post vote does not belong to the specified post",
      400,
    );
  }

  if (vote.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own votes",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_post_votes.delete({
    where: { id: props.postVoteId },
  });
}
