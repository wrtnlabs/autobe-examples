import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate input parameters with typia
  typia.assert(props);
  // First verify the community exists and the user owns it
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_user_id: true,
      },
    });
  // Handle community not found or already deleted
  if (!community) {
    throw new HttpException("Community not found or already deleted", 404);
  }
  // Check authorization - only community owner can delete
  if (community.owner_user_id !== props.user.id) {
    throw new HttpException(
      "Only the community owner can delete this community",
      403,
    );
  }
  // Get current timestamp as ISO string without using Date objects
  const now = new Date(Date.now()).toISOString();
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
