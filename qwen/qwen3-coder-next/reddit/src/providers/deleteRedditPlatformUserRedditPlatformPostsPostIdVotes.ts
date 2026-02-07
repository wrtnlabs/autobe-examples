import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformUserRedditPlatformPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostVote.IRemove> {
  // Find the existing vote for this user and post
  const vote = await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
    where: {
      post_id: props.postId,
      user_id: props.user.id,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Get the vote type to calculate score adjustment
  const voteType = vote.vote_type;
  // Delete the vote record
  await MyGlobal.prisma.reddit_platform_post_votes.delete({
    where: {
      id: vote.id,
    },
  });
  // Adjust the post's vote score
  if (voteType === "upvote") {
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: {
        id: props.postId,
      },
      data: {
        vote_score: {
          decrement: 1,
        },
      },
    });
  } else if (voteType === "downvote") {
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: {
        id: props.postId,
      },
      data: {
        vote_score: {
          increment: 1,
        },
      },
    });
  }
  return {};
}
