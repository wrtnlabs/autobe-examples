import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommunities(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Ensure global uniqueness for community slug (case-insensitive)
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.body.name.toLowerCase(),
      },
    });
  if (existing) {
    throw new HttpException("Community name already exists", 409);
  }

  // Generate ids and timestamps
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Create the new community
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id,
      name: props.body.name,
      display_title: props.body.display_title,
      description: props.body.description,
      visibility: props.body.visibility,
      image_url: props.body.image_url ?? null,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Assign the creating user as initial moderator
  await MyGlobal.prisma.community_platform_community_moderators.create({
    data: {
      id: v4(),
      community_platform_community_id: id,
      moderator_id: props.user.id,
      assigned_at: now,
      status: "active",
    },
  });

  // Return the DTO strictly following type requirements
  return {
    id: created.id,
    name: created.name,
    display_title: created.display_title,
    description: created.description,
    visibility: created.visibility,
    image_url: created.image_url ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
