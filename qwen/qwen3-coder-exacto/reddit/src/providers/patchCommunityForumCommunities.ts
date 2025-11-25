import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import { IPageICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityGroup";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityForumCommunities(props: {
  body: ICommunityForumCommunityGroup.IRequest;
}): Promise<IPageICommunityForumCommunityGroup.ISummary> {
  // Set default values for pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.community_forum_communitiesWhereInput = {
    deleted_at: null,
  };

  // Apply search filter
  if (props.body.search) {
    where.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply privacy level filter
  if (props.body.privacy_levels && props.body.privacy_levels.length > 0) {
    where.privacy_level = { in: props.body.privacy_levels };
  }

  // Apply status filter
  if (props.body.statuses && props.body.statuses.length > 0) {
    where.status = { in: props.body.statuses };
  }

  // Apply creation date filters
  if (props.body.created_after || props.body.created_before) {
    where.created_at = {};
    if (props.body.created_after) {
      where.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      where.created_at.lte = props.body.created_before;
    }
  }

  // Apply member count filters
  if (
    props.body.min_members !== undefined ||
    props.body.max_members !== undefined
  ) {
    where.member_count = {};
    if (props.body.min_members !== undefined) {
      where.member_count.gte = props.body.min_members;
    }
    if (props.body.max_members !== undefined) {
      where.member_count.lte = props.body.max_members;
    }
  }

  // Determine sort order
  let orderBy: Prisma.community_forum_communitiesOrderByWithRelationInput = {};
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder =
    props.body.sort_order ?? (sortBy === "name" ? "asc" : "desc");

  switch (sortBy) {
    case "member_count":
      orderBy = { member_count: sortOrder };
      break;
    case "post_count":
      orderBy = { post_count: sortOrder };
      break;
    case "name":
      orderBy = { name: sortOrder };
      break;
    case "created_at":
    default:
      orderBy = { created_at: sortOrder };
      break;
  }

  // Execute queries
  const [communities, total] = await Promise.all([
    MyGlobal.prisma.community_forum_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_communities.count({ where }),
  ]);

  // Transform to API response format
  const data = communities.map((community) => ({
    id: community.id,
    name: community.name,
    slug: community.slug,
    title: community.title,
    description: community.description,
    privacy_level: community.privacy_level as
      | "public"
      | "private"
      | "restricted",
    status: community.status as "active" | "inactive" | "archived",
    member_count: community.member_count,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : (undefined as any),
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
