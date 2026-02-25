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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify community exists
    const community = await tx.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
    if (!community) {
      throw new HttpException("Community not found", 404);
    }
    // Verify moderator assignment exists and belongs to the community
    const assignment =
      await tx.community_platform_community_moderators.findUnique({
        where: {
          id: props.moderatorId,
          community_id: props.communityId,
        },
      });
    if (!assignment) {
      throw new HttpException("Moderator assignment not found", 404);
    }
    // Delete the moderator assignment
    await tx.community_platform_community_moderators.delete({
      where: { id: props.moderatorId },
    });
  });
}
