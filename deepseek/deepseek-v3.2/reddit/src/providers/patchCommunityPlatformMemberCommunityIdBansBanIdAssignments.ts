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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanAssignmentAtSummaryTransformer } from "../transformers/CommunityPlatformBanAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunityIdBansBanIdAssignments(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBanAssignment.IRequest;
}): Promise<IPageICommunityPlatformBanAssignment.ISummary> {
  // 1. Verify member is moderator or owner of the community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderationRole) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify ban exists in the specified community
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
    select: { id: true },
  });
  if (!ban) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Build WHERE clause
  const whereInput = {
    community_platform_ban_id: props.banId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          assignment_reason_text: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          enforcement_notes: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.updated_at_from && {
      updated_at: { gte: new Date(props.body.updated_at_from) },
    }),
    ...(props.body.updated_at_to && {
      updated_at: { lte: new Date(props.body.updated_at_to) },
    }),
  } satisfies Prisma.community_platform_ban_assignmentsWhereInput;
  // 4. Build ORDER BY clause
  const orderByInput = (
    props.body.sort === "updated_at"
      ? { updated_at: props.body.order ?? "desc" }
      : props.body.sort === "assignment_reason_text"
        ? { assignment_reason_text: props.body.order ?? "asc" }
        : { created_at: props.body.order ?? "desc" }
  ) satisfies Prisma.community_platform_ban_assignmentsOrderByWithRelationInput;
  // 5. Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 6. Execute queries
  const [assignments, total] = await Promise.all([
    MyGlobal.prisma.community_platform_ban_assignments.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformBanAssignmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_ban_assignments.count({
      where: whereInput,
    }),
  ]);
  // 7. Transform results
  const data = await ArrayUtil.asyncMap(
    assignments,
    CommunityPlatformBanAssignmentAtSummaryTransformer.transform,
  );
  // 8. Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
