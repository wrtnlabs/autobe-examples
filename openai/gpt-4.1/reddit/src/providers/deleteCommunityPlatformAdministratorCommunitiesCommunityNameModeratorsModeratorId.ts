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

export async function deleteCommunityPlatformAdministratorCommunitiesCommunityNameModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found.", 404);
  }

  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Moderator assignment not found or already removed.",
      404,
    );
  }

  const deleted = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: moderator.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  return {
    id: deleted.id,
    email: deleted.email,
    status: deleted.status,
    business_status:
      typeof deleted.business_status === "undefined"
        ? undefined
        : deleted.business_status,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
