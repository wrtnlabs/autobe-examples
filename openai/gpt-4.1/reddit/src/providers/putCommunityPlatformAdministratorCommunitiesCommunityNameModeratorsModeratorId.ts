import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorCommunitiesCommunityNameModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerator.IUpdate;
}): Promise<ICommunityPlatformModerator> {
  // Validate community existence by its unique name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found or deleted", 404);
  }

  // Validate moderator existence
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.moderatorId },
    });
  if (!moderator || moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found or deleted", 404);
  }

  // Ensure the new email is unique among all moderators except this moderator
  if (moderator.email !== props.body.email) {
    const emailConflict =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.moderatorId },
        },
      });
    if (emailConflict) {
      throw new HttpException(
        "Email is already used by another moderator",
        409,
      );
    }
  }

  // Apply update
  const updated = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: {
      email: props.body.email,
      status: props.body.status,
      business_status: Object.prototype.hasOwnProperty.call(
        props.body,
        "business_status",
      )
        ? props.body.business_status
        : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return API-safe moderator entity
  return {
    id: updated.id,
    email: updated.email,
    status: updated.status,
    business_status:
      typeof updated.business_status === "undefined"
        ? undefined
        : updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
