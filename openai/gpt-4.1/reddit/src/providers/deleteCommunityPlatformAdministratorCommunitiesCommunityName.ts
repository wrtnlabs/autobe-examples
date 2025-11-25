import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorCommunitiesCommunityName(props: {
  administrator: AdministratorPayload;
  communityName: string;
}): Promise<ICommunityPlatformCommunity> {
  // Find community by unique, case-insensitive name and ensure it is not already deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found or already deleted", 404);
  }
  // Soft delete: set deleted_at to current time (as string in ISO format)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: community.id },
    data: { deleted_at: now, updated_at: now },
  });
  return {
    id: updated.id,
    name: updated.name,
    display_title: updated.display_title,
    description: updated.description,
    visibility: updated.visibility,
    image_url: updated.image_url === null ? undefined : updated.image_url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
