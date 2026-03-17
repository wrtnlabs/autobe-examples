import { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformKarmaAtSummaryTransformer } from "../transformers/CommunityPlatformKarmaAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminKarmas(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarma.IRequest;
}): Promise<IPageICommunityPlatformKarma.ISummary> {
  // Import AdminPayload type - REMOVED
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const where: Prisma.community_platform_karmasWhereInput = {
    deleted_at: null,
    ...(props.body.member_id && { member_id: props.body.member_id }),
    ...(props.body.min_score !== undefined && {
      score: { gte: props.body.min_score },
    }),
    ...(props.body.max_score !== undefined && {
      score: { lte: props.body.max_score },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: new Date(props.body.updated_at_start) },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: new Date(props.body.updated_at_end) },
    }),
    ...(props.body.search && {
      member: {
        OR: [
          { username: { contains: props.body.search, mode: "insensitive" } },
          { nickname: { contains: props.body.search, mode: "insensitive" } },
        ],
      },
    }),
  };
  // Build ORDER BY clause
  let orderBy: Prisma.community_platform_karmasOrderByWithRelationInput;
  switch (props.body.sort) {
    case "score-asc":
      orderBy = { score: "asc" };
      break;
    case "score-desc":
      orderBy = { score: "desc" };
      break;
    case "created_at-asc":
      orderBy = { created_at: "asc" };
      break;
    case "created_at-desc":
      orderBy = { created_at: "desc" };
      break;
    case "updated_at-asc":
      orderBy = { updated_at: "asc" };
      break;
    case "updated_at-desc":
      orderBy = { updated_at: "desc" };
      break;
    default:
      orderBy = { score: "desc" };
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karmas.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformKarmaAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_karmas.count({ where }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformKarmaAtSummaryTransformer.transform,
  );
  // Return paginated response
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
