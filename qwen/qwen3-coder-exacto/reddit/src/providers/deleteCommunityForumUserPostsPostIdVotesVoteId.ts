import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserPostsPostIdVotesVoteId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_forum_post_votes.findUnique({
    where: {
      id: props.voteId,
      community_forum_user_id: props.user.id,
      community_forum_post_id: props.postId,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found or does not belong to user", 404);
  }
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  await MyGlobal.prisma.community_forum_post_votes.delete({
    where: { id: props.voteId },
  });
}
