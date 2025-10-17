import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityIdModeratorAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.IUpdate;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  // Step 1: Verify assignment exists for the given community and assignmentId
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          id: props.assignmentId,
          community_id: props.communityId,
        },
      },
    );
  if (!assignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }

  // Step 2: Business logic (ownership/orphan prevention):
  // Only need to check if role change to non-owner and assignment is sole owner
  if (
    props.body.role !== undefined &&
    assignment.role === "owner" &&
    props.body.role !== "owner"
  ) {
    // Count current owners except this assignment (owners in same community, not deleted, not this one, end_at null)
    const otherOwnersCount =
      await MyGlobal.prisma.community_platform_community_moderator_assignments.count(
        {
          where: {
            community_id: props.communityId,
            role: "owner",
            id: { not: props.assignmentId },
            end_at: null,
          },
        },
      );
    if (otherOwnersCount === 0) {
      throw new HttpException(
        "Cannot demote the only owner. Every community must retain at least one owner.",
        400,
      );
    }
  }

  // Step 3: Update
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.update(
      {
        where: { id: props.assignmentId },
        data: {
          role: props.body.role ?? undefined,
          end_at: props.body.end_at ?? undefined,
          note: props.body.note ?? undefined,
          updated_at: now,
        },
        select: {
          id: true,
          community_id: true,
          member_id: true,
          role: true,
          assigned_by_id: true,
          start_at: true,
          end_at: true,
          note: true,
          created_at: true,
          updated_at: true,
        },
      },
    );

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
