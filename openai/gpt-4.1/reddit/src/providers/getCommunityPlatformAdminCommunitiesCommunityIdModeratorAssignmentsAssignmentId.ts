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

export async function getCommunityPlatformAdminCommunitiesCommunityIdModeratorAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  const record =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          id: props.assignmentId,
          community_id: props.communityId,
        },
      },
    );
  if (!record) {
    throw new HttpException(
      "Moderator assignment not found or does not belong to this community",
      404,
    );
  }
  return {
    id: record.id,
    community_id: record.community_id,
    member_id: record.member_id,
    role: record.role,
    assigned_by_id: record.assigned_by_id,
    start_at: toISOStringSafe(record.start_at),
    end_at: record.end_at ? toISOStringSafe(record.end_at) : undefined,
    note: record.note ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
