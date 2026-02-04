import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberSearchMembers(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const { search, page = 1, limit = 20 } = props.body;
  // Search term must be 1-100 chars (guaranteed by schema)
  // Page must be >=1, limit between 1-100 (guaranteed by schema)
  // Convert search term to lowercase for case-insensitive matching
  const searchLower = search.toLowerCase();
  // Execute search with PostgreSQL full-text search
  // Use 'contains' for case-insensitive substring matching (Prisma-compatible)
  const data = await MyGlobal.prisma.community_platform_members.findMany({
    where: {
      username: {
        contains: searchLower,
      },
      deleted_at: null,
    },
    select: {
      id: true, // Only select what's needed - we don't return anything in ISummary
    },
    orderBy: {
      // Primary: exact match
      username: "asc",
    },
    skip: (page - 1) * limit,
    take: limit,
  });
  // Count total records matching search
  const total = await MyGlobal.prisma.community_platform_members.count({
    where: {
      username: {
        contains: searchLower,
      },
      deleted_at: null,
    },
  });
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  // Return ISummary - which is an empty object {}
  // Per schema: ISummary = {} - so return empty objects
  const summaryData = data.map(() => ({}));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: summaryData,
  };
}
