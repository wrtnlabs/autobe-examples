import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModeratorAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityId, assignmentId } = props;
  // Fetch the assignment and ensure it corresponds to the provided community
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          id: assignmentId,
          community_id: communityId,
        },
      },
    );
  if (!assignment)
    throw new HttpException("Moderator assignment does not exist", 404);
  // If already ended
  if (assignment.end_at !== null)
    throw new HttpException("This moderator assignment has already ended", 409);

  // If the role is 'owner', ensure this is not the last owner in the community
  if (assignment.role === "owner") {
    const activeOwnerCount =
      await MyGlobal.prisma.community_platform_community_moderator_assignments.count(
        {
          where: {
            community_id: communityId,
            role: "owner",
            end_at: null,
          },
        },
      );
    if (activeOwnerCount <= 1)
      throw new HttpException(
        "Cannot remove the last owner from a community",
        403,
      );
  }

  // Mark assignment as ended (soft delete by setting end_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_community_moderator_assignments.update(
    {
      where: { id: assignmentId },
      data: {
        end_at: now,
        updated_at: now,
      },
    },
  );
}
