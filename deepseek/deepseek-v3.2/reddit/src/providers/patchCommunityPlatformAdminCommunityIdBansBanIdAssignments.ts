import { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanAssignment";
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

export async function patchCommunityPlatformAdminCommunityIdBansBanIdAssignments(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBanAssignment.IRequest;
}): Promise<IPageICommunityPlatformBanAssignment.ISummary> {
  // 1. Verify admin has moderator role in community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.admin.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        OR: [{ role_type: "owner" }, { role_type: "moderator" }],
      },
    });
  if (!moderationRole) {
    throw new HttpException(
      "Forbidden: Not a community moderator or owner",
      403,
    );
  }
  // 2. Verify ban exists in specified community
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!ban) {
    throw new HttpException("Ban not found in community", 404);
  }
  // 3. Build where clause for assignments
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const searchText = props.body.search;
  const searchFilter = searchText
    ? {
        OR: [
          {
            assignment_reason_text: {
              contains: searchText,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            enforcement_notes: {
              contains: searchText,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};
  const createdAtFrom = props.body.created_at_from
    ? new Date(props.body.created_at_from)
    : undefined;
  const createdAtTo = props.body.created_at_to
    ? new Date(props.body.created_at_to)
    : undefined;
  const updatedAtFrom = props.body.updated_at_from
    ? new Date(props.body.updated_at_from)
    : undefined;
  const updatedAtTo = props.body.updated_at_to
    ? new Date(props.body.updated_at_to)
    : undefined;
  const createdAtFilter = {
    ...(createdAtFrom && { created_at: { gte: createdAtFrom } }),
    ...(createdAtTo && { created_at: { lte: createdAtTo } }),
  };
  const updatedAtFilter = {
    ...(updatedAtFrom && { updated_at: { gte: updatedAtFrom } }),
    ...(updatedAtTo && { updated_at: { lte: updatedAtTo } }),
  };
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderBy = { [sortField]: sortOrder } as const;
  const whereClause = {
    community_platform_ban_id: props.banId,
    deleted_at: null,
    ...searchFilter,
    ...(Object.keys(createdAtFilter).length > 0 && createdAtFilter),
    ...(Object.keys(updatedAtFilter).length > 0 && updatedAtFilter),
  } satisfies Prisma.community_platform_ban_assignmentsWhereInput;
  // 4. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_ban_assignments.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        community_platform_ban_id: true,
        assignment_reason_text: true,
        enforcement_notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_ban_assignments.count({
      where: whereClause,
    }),
  ]);
  // 5. Return formatted response
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data.map((assignment) => ({
      id: assignment.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      assignmentReasonText: assignment.assignment_reason_text ?? null,
      enforcementNotes: assignment.enforcement_notes ?? null,
      createdAt: toISOStringSafe(assignment.created_at),
      updatedAt: toISOStringSafe(assignment.updated_at),
    })) satisfies ICommunityPlatformBanAssignment.ISummary[],
  };
}
