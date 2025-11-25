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

export async function putCommunityPlatformAdministratorCommunitiesCommunityName(props: {
  administrator: AdministratorPayload;
  communityName: string;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const allowedVisibilities = ["public", "private", "invite-only"];
  const allowedStatuses = ["active", "archived", "banned", "pending approval"];

  // 1. Find community by unique URL slug (case-insensitive)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.communityName.toLowerCase() },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Validate fields from DTO
  if (
    props.body.visibility !== undefined &&
    !allowedVisibilities.includes(props.body.visibility)
  ) {
    throw new HttpException("Invalid visibility value", 400);
  }

  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }

  // 3. Prepare update data (pick only defined fields)
  const data: Record<string, unknown> = {};
  if (props.body.display_title !== undefined)
    data.display_title = props.body.display_title;
  if (props.body.description !== undefined)
    data.description = props.body.description;
  if (props.body.visibility !== undefined)
    data.visibility = props.body.visibility;
  if (props.body.image_url !== undefined) data.image_url = props.body.image_url;
  if (props.body.status !== undefined) data.status = props.body.status;
  data.updated_at = toISOStringSafe(new Date());

  // 4. Update in DB
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: community.id },
    data,
  });

  return {
    id: updated.id,
    name: updated.name,
    display_title: updated.display_title,
    description: updated.description,
    visibility: updated.visibility,
    image_url:
      updated.image_url === null || typeof updated.image_url === "undefined"
        ? null
        : updated.image_url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
