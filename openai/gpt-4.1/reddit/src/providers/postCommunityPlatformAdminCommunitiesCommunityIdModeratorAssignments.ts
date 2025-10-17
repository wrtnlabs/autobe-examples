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

export async function postCommunityPlatformAdminCommunitiesCommunityIdModeratorAssignments(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.ICreate;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  const { admin, communityId, body } = props;
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
        NOT: { status: "archived" },
      },
    });
  if (!community) {
    throw new HttpException("Community not found or archived.", 404);
  }
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: body.member_id,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Target member not found or deleted.", 404);
  }
  const existing =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          community_id: communityId,
          member_id: body.member_id,
          role: body.role,
          end_at: null,
        },
      },
    );
  if (existing) {
    throw new HttpException(
      "This member already holds this moderator role for the community.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_id: communityId,
          member_id: body.member_id,
          role: body.role,
          assigned_by_id: admin.id,
          start_at: toISOStringSafe(body.start_at),
          end_at: undefined, // not set on creation
          note: body.note ?? undefined,
          created_at: now,
          updated_at: now,
        },
      },
    );
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
