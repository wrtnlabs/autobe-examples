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

export async function getCommunityPlatformAdministratorCommunitiesCommunityNameModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const assignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        moderator_id: props.moderatorId,
      },
    });
  if (!assignment) {
    throw new HttpException("Moderator is not assigned to this community", 404);
  }

  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: {
        id: props.moderatorId,
        // Only active/suspended/pending/banned are allowed for API, but don't restrict here.
      },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: moderator.id,
    email: moderator.email,
    status: moderator.status,
    business_status:
      moderator.business_status === null
        ? undefined
        : moderator.business_status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.deleted_at === null
        ? undefined
        : toISOStringSafe(moderator.deleted_at),
  };
}
