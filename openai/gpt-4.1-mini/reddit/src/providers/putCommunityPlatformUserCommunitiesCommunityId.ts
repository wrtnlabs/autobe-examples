import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function putCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);
  if (community.owner_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if body has "name" property and it is not null or undefined
  if (
    props.body &&
    typeof props.body === "object" &&
    "name" in props.body &&
    typeof (props.body as any).name === "string" &&
    (props.body as any).name
  ) {
    const existing =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: (props.body as any).name,
          id: { not: props.communityId },
        },
      });
    if (existing) throw new HttpException("Community name already exists", 409);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const result = await tx.community_platform_communities.update({
      where: { id: props.communityId },
      data: {
        name:
          props.body &&
          "name" in props.body &&
          (props.body as any).name !== undefined
            ? (props.body as any).name
            : community.name,
        description:
          props.body &&
          "description" in props.body &&
          (props.body as any).description !== undefined
            ? (props.body as any).description
            : community.description,
        icon_url:
          props.body &&
          "icon_url" in props.body &&
          (props.body as any).icon_url !== undefined
            ? (props.body as any).icon_url
            : community.icon_url,
      },
      select: {
        id: true,
        owner_user_id: true,
        name: true,
        description: true,
        icon_url: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
    return {
      id: result.id,
      owner_user_id: result.owner_user_id,
      name: result.name,
      description: result.description,
      icon_url: result.icon_url === null ? null : result.icon_url,
      deleted_at:
        result.deleted_at === null ? null : toISOStringSafe(result.deleted_at),
      created_at: toISOStringSafe(result.created_at),
      updated_at: toISOStringSafe(result.updated_at),
      owner_user: {
        id: result.ownerUser.id,
        email: result.ownerUser.email,
        display_name: result.ownerUser.display_name,
        bio: result.ownerUser.bio === null ? null : result.ownerUser.bio,
        avatar_url:
          result.ownerUser.avatar_url === null
            ? null
            : result.ownerUser.avatar_url,
        created_at: toISOStringSafe(result.ownerUser.created_at),
        updated_at: toISOStringSafe(result.ownerUser.updated_at),
      },
    };
  });
  return updated;
}
