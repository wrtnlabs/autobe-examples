import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationRoleAtSummaryTransformer } from "../transformers/CommunityPlatformModerationRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunityIdModerationRoles(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IRequest;
}): Promise<IPageICommunityPlatformModerationRole.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build where clause with community filter
  const whereInput: Prisma.community_platform_moderation_rolesWhereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.role_type && { role_type: props.body.role_type }),
    ...(props.body.assigned_by_member_id && {
      assigned_by_community_platform_member_id:
        props.body.assigned_by_member_id,
    }),
    ...(props.body.member_id && {
      community_platform_member_id: props.body.member_id,
    }),
    ...(props.body.active !== undefined && {
      deleted_at: props.body.active ? null : { not: null },
    }),
  };
  // Add search filter if provided
  if (props.body.search) {
    whereInput.OR = [
      {
        member: {
          OR: [
            { username: { contains: props.body.search, mode: "insensitive" } },
            { nickname: { contains: props.body.search, mode: "insensitive" } },
          ],
        },
      },
      {
        assignedBy: {
          OR: [
            { username: { contains: props.body.search, mode: "insensitive" } },
            { nickname: { contains: props.body.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }
  // Build orderBy
  const orderByInput: Prisma.community_platform_moderation_rolesOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: "desc" }
      : props.body.sort === "role_type"
        ? { role_type: "asc" }
        : { created_at: "desc" };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data with transformer select
  const data =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformModerationRoleAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.community_platform_moderation_roles.count(
    {
      where: whereInput,
    },
  );
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationRoleAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / Math.max(1, limit)),
    } satisfies IPage.IPagination,
  };
}
