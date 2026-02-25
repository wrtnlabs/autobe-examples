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
  // Verify the community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Check if the moderator exists in the community and get their role
  const communityModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          community_id_community_moderator_id: {
            community_id: props.communityId,
            community_moderator_id: props.moderatorId,
          },
        },
        select: { role: true },
      },
    );
  // Prohibit deletion if the moderator is the owner
  if (communityModerator.role === "owner") {
    throw new HttpException("Cannot delete the owner moderator directly", 403);
  }
  // Verify the actor's permission: must be admin or community owner
  const ownerRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: { community_id: props.communityId, role: "owner" },
      select: { community_moderator_id: true },
    });
  if (ownerRecord === null) {
    throw new HttpException("Owner not found for the community", 403);
  }
  if (
    props.admin.id !== ownerRecord.community_moderator_id &&
    props.admin.type !== "admin"
  ) {
    throw new HttpException(
      "Forbidden: only the community owner or admin can remove moderators",
      403,
    );
  }
  // Delete the community moderator record
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: {
      community_id_community_moderator_id: {
        community_id: props.communityId,
        community_moderator_id: props.moderatorId,
      },
    },
  });
  // Audit logging can be performed here if required
}
