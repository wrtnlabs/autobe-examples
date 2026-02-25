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

export async function deleteCommunityPlatformUserCommunitiesCommunityIdModeratorsModeratorAssignmentId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and user is the owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_user_id: true,
      } satisfies Prisma.community_platform_communitiesFindUniqueArgs["select"],
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_user_id !== props.user.id) {
    throw new HttpException("Only community owner can remove moderators", 403);
  }
  // Verify moderator assignment exists and belongs to the community
  const assignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findUnique({
      where: {
        id: props.moderatorAssignmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
      } satisfies Prisma.community_platform_moderator_assignmentsFindUniqueArgs["select"],
    });
  if (!assignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  if (assignment.community_id !== props.communityId) {
    throw new HttpException(
      "Moderator assignment does not belong to this community",
      400,
    );
  }
  // Perform soft deletion with proper ISO string
  const now = new Date().toISOString();
  await MyGlobal.prisma.community_platform_moderator_assignments.update({
    where: { id: props.moderatorAssignmentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
