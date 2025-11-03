import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm the moderator assignment exists for this community
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.moderatorId },
    });
  if (
    !moderator ||
    moderator.community_platform_community_id !== props.communityId
  ) {
    throw new HttpException(
      "Moderator assignment not found for this community",
      404,
    );
  }

  // Count current number of moderators for this community
  const moderatorCount =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: { community_platform_community_id: props.communityId },
    });

  if (moderatorCount <= 1) {
    throw new HttpException(
      "Cannot remove the last remaining moderator from this community",
      400,
    );
  }

  // Delete the moderator assignment row
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: { id: props.moderatorId },
  });
}
