import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }

  // Fetch post to get community id
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { reddit_community_community_id: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Author check
  if (comment.reddit_community_registereduser_id === props.registeredUser.id) {
    await MyGlobal.prisma.reddit_community_comments.delete({
      where: { id: props.commentId },
    });
    return;
  }

  // Fetch registered user email
  const user =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: props.registeredUser.id },
      select: { email: true },
    });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if user is a moderator by email
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: { email: user.email },
    },
  );

  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_comments.delete({
    where: { id: props.commentId },
  });
}
