import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify moderator has permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator permissions for this community",
      403,
    );
  }
  // Verify the ban exists and belongs to the specified community
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: { id: props.banId },
      select: { id: true, community_id: true },
    });
  if (!ban) {
    throw new HttpException("Ban record not found", 404);
  }
  if (ban.community_id !== props.communityId) {
    throw new HttpException(
      "Ban record does not belong to the specified community",
      400,
    );
  }
  // Delete the ban record
  await MyGlobal.prisma.community_platform_community_bans.delete({
    where: { id: props.banId },
  });
}
