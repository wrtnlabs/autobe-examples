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

export async function deleteCommunityPlatformAdminCommunityModeratorsCommunityModeratorId(props: {
  admin: AdminPayload;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the moderator assignment record's community_id
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.communityModeratorId },
      select: {
        id: true,
        community_id: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Community moderator assignment not found", 404);
  }
  // Find the community to get its owner_user_id
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: moderator.community_id },
      select: {
        owner_user_id: true,
      },
    });
  if (!community) {
    throw new HttpException(
      "Community not found for moderator assignment",
      404,
    );
  }
  // Only the community owner or system admin can delete the assignment
  if (community.owner_user_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform deletion
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: { id: props.communityModeratorId },
  });
}
