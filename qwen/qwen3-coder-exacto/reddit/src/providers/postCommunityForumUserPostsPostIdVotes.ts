import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityPostVote.ICreate;
}): Promise<ICommunityForumCommunityPostVote> {
  // First, verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Prevent users from voting on their own posts
  if (post.community_forum_user_id === props.user.id) {
    throw new HttpException("You cannot vote on your own post", 400);
  }

  // Get current timestamp for consistent usage
  const currentTime = toISOStringSafe(new Date());

  // Create or update the vote record
  const vote = await MyGlobal.prisma.community_forum_post_votes.upsert({
    where: {
      community_forum_user_id_community_forum_post_id: {
        community_forum_user_id: props.user.id,
        community_forum_post_id: props.postId,
      },
    },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: props.user.id,
      community_forum_post_id: props.postId,
      is_upvote: props.body.is_upvote,
      created_at: currentTime,
    },
    update: {
      is_upvote: props.body.is_upvote,
      // Note: We don't update created_at on updates as it represents the original vote time
    },
  });

  // Return the vote record in the correct format
  return {
    id: vote.id,
    community_forum_user_id: vote.community_forum_user_id,
    community_forum_post_id: vote.community_forum_post_id,
    is_upvote: vote.is_upvote,
    created_at: toISOStringSafe(vote.created_at),
  };
}
