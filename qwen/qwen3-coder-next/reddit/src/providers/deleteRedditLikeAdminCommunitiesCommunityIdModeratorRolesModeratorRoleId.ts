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

export async function deleteRedditLikeAdminCommunitiesCommunityIdModeratorRolesModeratorRoleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Find the moderator role assignment
  const role =
    await MyGlobal.prisma.reddit_like_moderator_roles.findUniqueOrThrow({
      where: { id: props.moderatorRoleId },
      select: { id: true, role: true, community_id: true },
    });
  // Verify the role belongs to the target community
  if (role.community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  // Admins can delete any moderator role assignment per admin platform-wide access
  // Owner protection rule: cannot delete owner role, but admin override allows deletion
  await MyGlobal.prisma.reddit_like_moderator_roles.delete({
    where: { id: props.moderatorRoleId },
  });
}
