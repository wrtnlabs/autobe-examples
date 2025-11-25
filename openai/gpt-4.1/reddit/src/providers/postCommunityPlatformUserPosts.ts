import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postCommunityPlatformUserPosts(props: {
  user: UserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Check if title is unique within this community
  const exists = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      community_id_title: {
        community_id: props.body.community_id,
        title: props.body.title,
      },
    },
  });
  if (exists) {
    throw new HttpException(
      "Post title must be unique within the community.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  // Create the post
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: v4(),
      type: props.body.type,
      title: props.body.title,
      body: props.body.body ?? null,
      link_url: props.body.link_url ?? null,
      image_url: props.body.image_url ?? null,
      status: props.body.status,
      community_id: props.body.community_id,
      user_id: props.user.id,
      user_session_id: props.user.session_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      user: true,
      userSession: true,
      community: true,
    },
  });
  return {
    id: created.id,
    type: created.type,
    title: created.title,
    body: created.body ?? undefined,
    link_url: created.link_url ?? undefined,
    image_url: created.image_url ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    user: { id: created.user.id },
    userSession: {
      id: created.userSession.id,
      created_at: toISOStringSafe(created.userSession.created_at),
    },
    community: {
      id: created.community.id,
      name: created.community.name,
      display_title: created.community.display_title,
      description: created.community.description,
      visibility: created.community.visibility,
      image_url: created.community.image_url ?? undefined,
      status: created.community.status,
    },
  };
}
