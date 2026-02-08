import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUser> {
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      posts: {
        where: { deleted_at: null },
        select: {
          id: true,
          title: true,
          post_type: true,
          created_at: true,
          updated_at: true,
        },
      },
      postComments: {
        where: { deleted_at: null },
        select: {
          id: true,
          post_id: true,
          content_text: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: user.id,
    display_name: user.display_name,
    bio: user.bio === null ? undefined : user.bio,
    avatar_url: user.avatar_url === null ? undefined : user.avatar_url,
    karma: user.karma,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    posts: user.posts.map((post) => ({
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
    })),
    comments: user.postComments.map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      content_text: comment.content_text,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
    })),
  };
}
