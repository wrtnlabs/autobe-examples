import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroupMembership";
import { IPageICommunityForumCommunityGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityGroupMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";

export async function patchCommunityForumCommunitiesCommunitySlugMemberships(props: {
  communitySlug: string;
  body: ICommunityForumCommunityGroupMembership.IRequest;
}): Promise<IPageICommunityForumCommunityGroupMembership.ISummary> {
  // Find the community by slug
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: { slug: props.communitySlug },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Prepare where conditions
  const where: Prisma.community_forum_community_membershipsWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };

  // Apply status filter if provided
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  } else if (props.body.status === null) {
    where.status = undefined;
  }

  // Apply role filter if provided
  if (props.body.role !== undefined && props.body.role !== null) {
    where.role = props.body.role;
  } else if (props.body.role === null) {
    where.role = undefined;
  }

  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Determine sort order
  const orderBy: Prisma.community_forum_community_membershipsOrderByWithRelationInput =
    {};

  if (props.body.sort_by === "joined_at") {
    orderBy.joined_at = props.body.order || "desc";
  } else if (props.body.sort_by === "role") {
    orderBy.role = props.body.order || "asc";
  } else {
    // Default sorting by joined_at descending
    orderBy.joined_at = "desc";
  }

  // Fetch memberships with user and community data
  const [memberships, total] = await Promise.all([
    MyGlobal.prisma.community_forum_community_memberships.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
        community: true,
      },
    }),
    MyGlobal.prisma.community_forum_community_memberships.count({
      where,
    }),
  ]);

  // Transform to API response format
  const data = memberships.map((membership) => ({
    id: membership.id,
    status: membership.status,
    role: membership.role,
    joined_at: toISOStringSafe(membership.joined_at),
    left_at: membership.left_at
      ? toISOStringSafe(membership.left_at)
      : undefined,
    banned_reason: membership.banned_reason ?? undefined,
    banned_until: membership.banned_until
      ? toISOStringSafe(membership.banned_until)
      : undefined,
    created_at: toISOStringSafe(membership.created_at),
    updated_at: toISOStringSafe(membership.updated_at),
    deleted_at: membership.deleted_at
      ? toISOStringSafe(membership.deleted_at)
      : undefined,
    user: {
      id: membership.user.id,
      username: membership.user.username,
    },
    community: {
      id: membership.community.id,
      name: membership.community.name,
      slug: membership.community.slug,
      title: membership.community.title,
      description: membership.community.description,
      privacy_level: membership.community.privacy_level as
        | "public"
        | "private"
        | "restricted",
      status: membership.community.status as "active" | "inactive" | "archived",
      member_count: membership.community.member_count,
      post_count: membership.community.post_count,
      created_at: toISOStringSafe(membership.community.created_at),
      updated_at: toISOStringSafe(membership.community.updated_at),
      deleted_at: membership.community.deleted_at
        ? toISOStringSafe(membership.community.deleted_at)
        : toISOStringSafe(new Date(0)), // Use epoch time as default for required field
    },
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
