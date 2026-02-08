import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
      author_user_id: true,
      author_moderator_id: true,
      title: true,
      post_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: {
        select: {
          id: true,
          owner_user_id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      authorUser: { select: { id: true, username: true, display_name: true } },
      authorModerator: {
        select: { id: true, username: true, display_name: true },
      },
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const createdAt: string & tags.Format<"date-time"> =
    post.created_at.toISOString();
  const updatedAt: string & tags.Format<"date-time"> =
    post.updated_at.toISOString();
  const deletedAt: (string & tags.Format<"date-time">) | null =
    post.deleted_at === null ? null : post.deleted_at.toISOString();
  const communityCreatedAt: string & tags.Format<"date-time"> =
    post.community.created_at.toISOString();
  const communityUpdatedAt: string & tags.Format<"date-time"> =
    post.community.updated_at.toISOString();
  const communityDeletedAt: (string & tags.Format<"date-time">) | null =
    post.community.deleted_at === null
      ? null
      : post.community.deleted_at.toISOString();
  return {
    id: post.id,
    community_id: post.community_id,
    author_user_id: post.author_user_id,
    author_moderator_id: post.author_moderator_id,
    title: post.title,
    post_type: post.post_type,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    community: {
      id: post.community.id,
      owner_user_id: post.community.owner_user_id,
      name: post.community.name,
      description: post.community.description,
      icon_url: post.community.icon_url,
      created_at: communityCreatedAt,
      updated_at: communityUpdatedAt,
      deleted_at: communityDeletedAt,
    },
    authorUser:
      post.authorUser === null
        ? null
        : {
            id: post.authorUser.id,
            username: post.authorUser.username,
            display_name: post.authorUser.display_name,
          },
    authorModerator:
      post.authorModerator === null
        ? null
        : {
            id: post.authorModerator.id,
            username: post.authorModerator.username,
            display_name: post.authorModerator.display_name,
          },
  };
}
