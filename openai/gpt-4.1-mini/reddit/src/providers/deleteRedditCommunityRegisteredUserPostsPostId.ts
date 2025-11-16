import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserPostsPostId(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_registered_user_id: true,
      reddit_community_id: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_registered_user_id === props.registeredUser.id) {
    await MyGlobal.prisma.reddit_community_posts.delete({
      where: { id: props.postId },
    });
    return;
  }

  const isModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_registered_user_id: props.registeredUser.id,
        reddit_community_id: post.reddit_community_id,
        deleted_at: null,
      },
    });

  if (isModerator) {
    await MyGlobal.prisma.reddit_community_posts.delete({
      where: { id: props.postId },
    });
    return;
  }

  const isAdmin = await MyGlobal.prisma.reddit_community_admins.findFirst({
    where: {
      id: props.registeredUser.id,
      deleted_at: null,
    },
  });

  if (isAdmin) {
    await MyGlobal.prisma.reddit_community_posts.delete({
      where: { id: props.postId },
    });
    return;
  }

  throw new HttpException("Forbidden", 403);
}
