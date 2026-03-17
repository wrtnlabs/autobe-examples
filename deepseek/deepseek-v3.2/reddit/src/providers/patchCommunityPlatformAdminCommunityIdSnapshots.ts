import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
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

export async function patchCommunityPlatformAdminCommunityIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Build where clause
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.type && { type: props.body.type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
  } satisfies Prisma.community_platform_community_snapshotsWhereInput;
  // Determine sort order
  const orderByInput = {
    created_at: props.body.ascending === true ? "asc" : "desc",
  } satisfies Prisma.community_platform_community_snapshotsOrderByWithRelationInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Fetch data with pagination
  const data =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        status: true,
        visibility: true,
        is_nsfw: true,
        is_archived: true,
        is_locked: true,
        member_count: true,
        subscriber_count: true,
        post_count: true,
        comment_count: true,
        created_at: true,
        owner_member_id: true,
      },
    });
  // Collect owner member IDs
  const ownerMemberIds = data.map((snapshot) => snapshot.owner_member_id);
  // Fetch owner member details
  const ownerMembers =
    ownerMemberIds.length > 0
      ? await MyGlobal.prisma.community_platform_members.findMany({
          where: {
            id: { in: ownerMemberIds },
          },
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          },
        })
      : [];
  // Create owner member map for quick lookup
  const ownerMemberMap = new Map(
    ownerMembers.map((member) => [member.id, member]),
  );
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where: whereInput,
    });
  // Transform to DTO format
  const transformedData = data.map((snapshot) => {
    const ownerMember = ownerMemberMap.get(snapshot.owner_member_id);
    return {
      id: snapshot.id as string & tags.Format<"uuid">,
      code: snapshot.code,
      name: snapshot.name,
      description: snapshot.description,
      type: snapshot.type,
      status: snapshot.status,
      visibility: snapshot.visibility,
      is_nsfw: snapshot.is_nsfw,
      is_archived: snapshot.is_archived,
      is_locked: snapshot.is_locked,
      member_count: snapshot.member_count as number & tags.Type<"int32">,
      subscriber_count: snapshot.subscriber_count as number &
        tags.Type<"int32">,
      post_count: snapshot.post_count as number & tags.Type<"int32">,
      comment_count: snapshot.comment_count as number & tags.Type<"int32">,
      owner_member: ownerMember
        ? ({
            id: ownerMember.id as string & tags.Format<"uuid">,
            email: ownerMember.email as string & tags.Format<"email">,
            username: ownerMember.username,
            nickname: ownerMember.nickname,
            email_verified: ownerMember.email_verified,
            registered_at: toISOStringSafe(ownerMember.registered_at),
            last_login_at: ownerMember.last_login_at
              ? toISOStringSafe(ownerMember.last_login_at)
              : null,
          } satisfies ICommunityPlatformMember.ISummary)
        : null,
      created_at: toISOStringSafe(snapshot.created_at),
    };
  });
  return {
    data: typia.assert<ICommunityPlatformCommunitySnapshot.ISummary[]>(
      transformedData,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
