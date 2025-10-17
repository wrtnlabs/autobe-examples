import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdModeratorAssignmentsAssignmentId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.IUpdate;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  const { moderator, communityId, assignmentId, body } = props;

  // 1. Find the assignment, and verify community match
  const current =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findUnique(
      {
        where: { id: assignmentId },
      },
    );
  if (!current) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  if (current.community_id !== communityId) {
    throw new HttpException(
      "Assignment does not belong to the target community",
      400,
    );
  }

  // 2. Fetch all assignments for this community to check moderation constraints
  const assignments =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findMany(
      {
        where: { community_id: communityId, end_at: null },
      },
    );

  // 3. Authorization: Check that the moderator has permission to perform the update
  // Fetch the moderator's own assignment for this community
  const selfAssignment = assignments.find((a) => a.member_id === moderator.id);
  if (!selfAssignment) {
    throw new HttpException(
      "You are not an assigned moderator in this community",
      403,
    );
  }
  // Only allow if updater is owner
  if (selfAssignment.role !== "owner") {
    throw new HttpException(
      "Only community owners can update moderator assignments",
      403,
    );
  }

  // 4. If role change is a demotion from 'owner'
  const isDemotingOwner =
    current.role === "owner" && body.role && body.role !== "owner";
  if (isDemotingOwner) {
    // Are there any other owners?
    const ownerCount = assignments.filter((a) => a.role === "owner").length;
    if (ownerCount <= 1) {
      throw new HttpException(
        "Cannot demote the last owner of a community",
        409,
      );
    }
  }

  // 5. Enforce max number of moderators (e.g., 10)
  const updatingToModerator =
    body.role === "moderator" && current.role !== "moderator";
  const moderatorCount = assignments.filter(
    (a) => a.role === "moderator",
  ).length;
  const MAX_MODS = 10;
  if (updatingToModerator && moderatorCount >= MAX_MODS) {
    throw new HttpException("Maximum number of moderators reached", 409);
  }

  // 6. Build update payload (do not use as/type assertions)
  const updateData: Record<string, unknown> = {
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(body.end_at !== undefined ? { end_at: body.end_at } : {}),
    ...(body.note !== undefined ? { note: body.note } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // 7. Update
  const updated =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.update(
      {
        where: { id: assignmentId },
        data: updateData,
      },
    );

  // 8. Return response in strict DTO format (all required, handle null/optional)
  return {
    id: updated.id,
    community_id: updated.community_id,
    member_id: updated.member_id,
    role: updated.role,
    assigned_by_id: updated.assigned_by_id,
    start_at: toISOStringSafe(updated.start_at),
    end_at: updated.end_at ? toISOStringSafe(updated.end_at) : undefined,
    note: updated.note ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
