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

export async function postCommunityPlatformModeratorCommunitiesCommunityIdModeratorAssignments(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.ICreate;
}): Promise<ICommunityPlatformCommunityModeratorAssignment> {
  const now = toISOStringSafe(new Date());
  // 1. Check that the community exists and is not archived/deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community)
    throw new HttpException("Community not found or archived", 404);

  // 2. Check the acting moderator is assigned to this community (mod only)
  const assignerModerator =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          community_id: props.communityId,
          member_id: props.moderator.id,
          end_at: null,
        },
        select: { id: true },
      },
    );
  if (!assignerModerator)
    throw new HttpException(
      "Permission denied: Not a current moderator for this community",
      403,
    );

  // 3. Check the target member exists and is active
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: props.body.member_id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true },
  });
  if (!member)
    throw new HttpException("Target member not found or inactive", 404);

  // 4. Duplicate check (role uniqueness)
  const duplicate =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          community_id: props.communityId,
          member_id: props.body.member_id,
          role: props.body.role,
          end_at: null,
        },
        select: { id: true },
      },
    );
  if (duplicate)
    throw new HttpException("Duplicate moderator assignment exists", 409);

  // 5. Create assignment
  const created =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.create(
      {
        data: {
          id: v4(),
          community_id: props.communityId,
          member_id: props.body.member_id,
          role: props.body.role,
          assigned_by_id: props.moderator.id,
          start_at: props.body.start_at,
          end_at: null,
          note: props.body.note ?? null,
          created_at: now,
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
    id: created.id,
    community_id: created.community_id,
    member_id: created.member_id,
    role: created.role,
    assigned_by_id: created.assigned_by_id,
    start_at: toISOStringSafe(created.start_at),
    end_at: created.end_at != null ? toISOStringSafe(created.end_at) : null,
    note: created.note,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
