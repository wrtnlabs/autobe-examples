import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId } = props;

  // Check moderator assignment to target community, status active, not soft-deleted
  const modAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id,
        community_id: communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!modAssignment) {
    throw new HttpException(
      "Forbidden: not assigned as active moderator for this community",
      403,
    );
  }

  // Check target community exists and is not already archived
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found or already archived", 404);
  }

  // Archive/soft delete by setting deleted_at to now
  await MyGlobal.prisma.community_platform_communities.update({
    where: {
      id: communityId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Return void
}
