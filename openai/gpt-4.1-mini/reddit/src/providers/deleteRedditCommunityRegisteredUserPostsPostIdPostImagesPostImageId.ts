import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserPostsPostIdPostImagesPostImageId(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  postImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, reddit_registered_user_id: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden: You do not own this post", 403);
  }

  const postImage =
    await MyGlobal.prisma.reddit_community_post_images.findUnique({
      where: { id: props.postImageId },
      select: { id: true, reddit_community_post_id: true },
    });

  if (!postImage) {
    throw new HttpException("Post image not found", 404);
  }

  if (postImage.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Post image does not belong to the specified post",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_post_images.delete({
    where: { id: props.postImageId },
  });
}
