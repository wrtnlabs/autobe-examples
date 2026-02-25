import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdFlairAssignmentsAssignmentId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify moderator has privileges for the specified community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You don't have moderator privileges for this community",
      403,
    );
  }
  // Check if the flair assignment exists and belongs to the community
  const flairAssignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findUnique(
      {
        where: { id: props.assignmentId },
      },
    );
  if (!flairAssignment) {
    throw new HttpException("Flair assignment not found", 404);
  }
  if (flairAssignment.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Flair assignment does not belong to this community",
      403,
    );
  }
  // Perform soft deletion using toISOStringSafe for proper date handling
  const currentTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_community_flair_assignments.update({
    where: { id: props.assignmentId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
