import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          username: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.displayName && {
      display_name: {
        contains: props.body.displayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.email && {
      email: props.body.email,
    }),
    ...(props.body.karmaMin !== undefined && {
      karma: { gte: props.body.karmaMin },
    }),
    ...(props.body.karmaMax !== undefined && {
      karma: { lte: props.body.karmaMax },
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.community_platform_membersWhereInput;
  // Parse sort parameter - default is highest karma first (descending)
  const sortParam = props.body.sort ?? "-karma";
  const sortField = sortParam.startsWith("-") ? sortParam.slice(1) : sortParam;
  const sortDirection = sortParam.startsWith("-")
    ? ("desc" as const)
    : ("asc" as const);
  const orderByInput = (
    sortField === "karma"
      ? { karma: sortDirection }
      : sortField === "created_at"
        ? { created_at: sortDirection }
        : sortField === "username"
          ? { username: sortDirection }
          : { karma: "desc" as const }
  ) satisfies Prisma.community_platform_membersOrderByWithRelationInput;
  // Query data with transformer select
  const data = await MyGlobal.prisma.community_platform_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformMemberAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.community_platform_members.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformMemberAtSummaryTransformer.transform,
  );
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
