import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  // Verify moderator exists and is active
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Moderator account is inactive or does not exist",
      403,
    );
  }
  // Check if moderator is assigned to the specified community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You are not assigned as a moderator for this community",
      403,
    );
  }
  // Retrieve the ban with all related data using transformer
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
        community_id: props.communityId,
      },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  // Transform DB record to DTO
  return await CommunityPlatformCommunityBanTransformer.transform(ban);
}
