import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found or already deleted", 404);
  }
  // Verify moderator assignment exists and belongs to the specified community
  const assignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        id: props.moderatorAssignmentId,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new HttpException(
      "Moderator assignment not found or already deleted",
      404,
    );
  }
  // Perform soft deletion with proper datetime string handling
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_moderator_assignments.update({
    where: { id: props.moderatorAssignmentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
