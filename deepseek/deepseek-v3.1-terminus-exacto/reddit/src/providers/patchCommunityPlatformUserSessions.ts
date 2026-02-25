import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserSessionAtSummaryTransformer } from "../transformers/CommunityPlatformUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserSessions(props: {
  user: UserPayload;
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereConditions: Prisma.community_platform_user_sessionsWhereInput[] =
    [];
  // Filter by user_id if provided
  if (props.body.user_id) {
    whereConditions.push({
      user: { id: props.body.user_id },
    } satisfies Prisma.community_platform_user_sessionsWhereInput);
  }
  // Filter by IP address if provided
  if (props.body.ip) {
    whereConditions.push({
      ip: props.body.ip,
    } satisfies Prisma.community_platform_user_sessionsWhereInput);
  }
  // Filter by creation date range
  if (props.body.created_at_start || props.body.created_at_end) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start) {
      dateFilter.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      dateFilter.lte = new Date(props.body.created_at_end);
    }
    whereConditions.push({
      created_at: dateFilter,
    } satisfies Prisma.community_platform_user_sessionsWhereInput);
  }
  // Filter by expiration status
  if (props.body.expired !== undefined) {
    const now = new Date();
    whereConditions.push({
      expired_at: props.body.expired ? { lt: now } : { gte: now },
    } satisfies Prisma.community_platform_user_sessionsWhereInput);
  }
  // Free-text search across IP and user_agent
  if (props.body.search) {
    whereConditions.push({
      OR: [
        { ip: { contains: props.body.search, mode: "insensitive" as const } },
        {
          user_agent: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    } satisfies Prisma.community_platform_user_sessionsWhereInput);
  }
  const whereInput: Prisma.community_platform_user_sessionsWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};
  // Determine sort order
  const orderByInput = (
    props.body.sort === "expired_at"
      ? { expired_at: "desc" as const }
      : props.body.sort === "ip"
        ? { ip: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_user_sessionsOrderByWithRelationInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformUserSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_user_sessions.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformUserSessionAtSummaryTransformer.transform,
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
