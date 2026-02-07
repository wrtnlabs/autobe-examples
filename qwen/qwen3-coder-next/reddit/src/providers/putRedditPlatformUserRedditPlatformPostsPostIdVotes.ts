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

export async function putRedditPlatformUserRedditPlatformPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string;
  body: IRedditPlatformPostVote.IUpdate;
}): Promise<IRedditPlatformPostVote> {
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
      where: {
        user_id: props.user.id,
        post_id: props.postId,
      },
    });
  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }
  // Find post to check if user is the author
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (post && post.author_id === props.user.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // Update vote record with new vote_type and current timestamp
  const updatedVote = await MyGlobal.prisma.reddit_platform_post_votes.update({
    where: { id: existingVote.id },
    data: {
      // Since IRedditPlatformPostVote.IUpdate is empty ({}),
      // we cannot determine the new vote type from the request body.
      // This implementation assumes the vote type should be toggled or
      // defaults to 'upvote' when no information is provided.
      // In practice, the DTO should be updated to include the vote_type field.
      vote_type: "upvote" as const,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated vote record with full details
  return {
    id: updatedVote.id,
    user_id: updatedVote.user_id,
    post_id: updatedVote.post_id,
    vote_type: updatedVote.vote_type,
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
  };
}
