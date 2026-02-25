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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdFlairAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify admin has moderator privileges for the specified community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.admin.id,
        community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator privileges for this community",
      403,
    );
  }
  // Check if the flair assignment exists and belongs to the specified community
  const flairAssignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findUnique(
      {
        where: {
          id: props.assignmentId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
      },
    );
  if (!flairAssignment) {
    throw new HttpException("Flair assignment not found", 404);
  }
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.community_platform_community_flair_assignments.update({
    where: {
      id: props.assignmentId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
