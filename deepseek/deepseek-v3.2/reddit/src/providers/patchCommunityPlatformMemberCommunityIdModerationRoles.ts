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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleAtSummaryTransformer } from "../transformers/CommunityPlatformModerationRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunityIdModerationRoles(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IRequest;
}): Promise<IPageICommunityPlatformModerationRole.ISummary> {
  // 1. Validate community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // 2. Verify requester has active moderation role in this community
  const requesterRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!requesterRole) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Build where clause with community scope and optional filters
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
    ...(props.body.active !== undefined && props.body.active === true
      ? { deleted_at: null }
      : props.body.active === false
        ? { deleted_at: { not: null } }
        : {}),
  };
  // 5. Apply search filter if provided (search by member username/nickname)
  if (props.body.search && props.body.search.trim()) {
    whereInput.member = {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { nickname: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }
  // 6. Determine sort order
  const orderByInput = (
    props.body.sort === "updated_at"
      ? { updated_at: "desc" as const }
      : props.body.sort === "role_type"
        ? { role_type: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_moderation_rolesOrderByWithRelationInput;
  // 7. Execute parallel queries for data and total count
  const [data, total]: [
    CommunityPlatformModerationRoleAtSummaryTransformer.Payload[],
    number,
  ] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformModerationRoleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_moderation_roles.count({
      where: whereInput,
    }),
  ]);
  // 8. Transform database payloads to DTOs
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationRoleAtSummaryTransformer.transform,
  );
  // 9. Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
