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

export async function getCommunityPlatformModeratorCommunitiesCommunityIdModeratorAssignmentsAssignmentId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  const { communityId, assignmentId } = props;
  // Find the moderator assignment for this community
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findUnique(
      {
        where: { id: assignmentId },
      },
    );
  if (!assignment || assignment.community_id !== communityId) {
    throw new HttpException(
      "Moderator assignment not found or invalid community",
      404,
    );
  }
  return {
    id: assignment.id,
    community_id: assignment.community_id,
    member_id: assignment.member_id,
    role: assignment.role,
    assigned_by_id: assignment.assigned_by_id,
    start_at: toISOStringSafe(assignment.start_at),
    end_at: assignment.end_at ? toISOStringSafe(assignment.end_at) : undefined,
    note: assignment.note ?? undefined,
    created_at: toISOStringSafe(assignment.created_at),
    updated_at: toISOStringSafe(assignment.updated_at),
  };
}
