import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this post.",
      403,
    );
  }

  // If title or community changes (title is present), check for uniqueness within the community_id
  if (typeof props.body.title === "string" && props.body.title !== post.title) {
    const dupe = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: {
        community_id: post.community_id,
        title: props.body.title,
        id: { not: props.postId },
        deleted_at: null,
      },
    });
    if (dupe) {
      throw new HttpException(
        "Title must be unique within this community.",
        409,
      );
    }
  }

  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.type !== undefined ? { type: props.body.type } : {}),
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.body !== undefined ? { body: props.body.body } : {}),
      ...(props.body.link_url !== undefined
        ? { link_url: props.body.link_url }
        : {}),
      ...(props.body.image_url !== undefined
        ? { image_url: props.body.image_url }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      user: true,
      userSession: true,
      community: true,
    },
  });

  return {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    body: updated.body === undefined ? undefined : updated.body,
    link_url: updated.link_url === undefined ? undefined : updated.link_url,
    image_url: updated.image_url === undefined ? undefined : updated.image_url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    user: { id: updated.user.id },
    userSession: {
      id: updated.userSession.id,
      created_at: toISOStringSafe(updated.userSession.created_at),
    },
    community: {
      id: updated.community.id,
      name: updated.community.name,
      display_title: updated.community.display_title,
      description: updated.community.description,
      visibility: updated.community.visibility,
      image_url:
        updated.community.image_url === undefined
          ? undefined
          : updated.community.image_url,
      status: updated.community.status,
    },
  };
}
