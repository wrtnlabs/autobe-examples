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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorIdPrivilegesPrivilegeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  privilegeId: string & tags.Format<"uuid">;
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
    throw new HttpException("Community not found", 404);
  }
  // Verify moderator assignment exists
  const assignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  // Verify privilege assignment exists and is active
  const privilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findFirst(
      {
        where: {
          id: props.privilegeId,
          community_platform_moderator_assignment_id: props.moderatorId,
          revoked_at: null,
          deleted_at: null,
        },
      },
    );
  if (!privilege) {
    throw new HttpException(
      "Privilege assignment not found or already revoked",
      404,
    );
  }
  // Revoke the privilege by setting revoked_at
  await MyGlobal.prisma.community_platform_moderator_assignment_privileges.update(
    {
      where: { id: props.privilegeId },
      data: {
        revoked_at: toISOStringSafe(new Date()),
      },
    },
  );
}
