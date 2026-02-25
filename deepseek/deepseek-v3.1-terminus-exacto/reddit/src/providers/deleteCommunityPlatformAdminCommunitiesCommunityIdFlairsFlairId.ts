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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdFlairsFlairId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  flairId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Verify flair exists and belongs to the community
  const flair =
    await MyGlobal.prisma.community_platform_community_flairs.findUniqueOrThrow(
      {
        where: {
          id: props.flairId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
      },
    );
  // Use transaction for atomic operations
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    // Perform soft delete on the flair
    await tx.community_platform_community_flairs.update({
      where: { id: props.flairId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    // Cascade soft delete all flair assignments linked to this flair
    await tx.community_platform_community_flair_assignments.updateMany({
      where: {
        community_platform_community_flair_id: props.flairId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
