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

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdFlairsFlairId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  flairId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if moderator has permissions for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator permissions for this community",
      403,
    );
  }
  // Verify flair exists and belongs to this community
  const flair =
    await MyGlobal.prisma.community_platform_community_flairs.findUnique({
      where: {
        id: props.flairId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!flair) {
    throw new HttpException("Flair not found", 404);
  }
  // Soft delete the flair using proper date handling
  await MyGlobal.prisma.community_platform_community_flairs.update({
    where: { id: props.flairId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
