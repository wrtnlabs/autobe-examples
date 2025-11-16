import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorVotingRateLimits(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformVotingRateLimit.IRequest;
}): Promise<IPageICommunityPlatformVotingRateLimit.ISummary> {
  const {
    page = 1,
    limit = 100,
    community_platform_user_id,
    ip,
    window_start_from,
    window_start_to,
    status,
    order_by = "window_start",
    order_direction = "desc",
  } = props.body ?? {};

  const filters: Record<string, unknown> = {};
  if (community_platform_user_id != null)
    filters.community_platform_user_id = community_platform_user_id;
  if (ip != null) filters.ip = ip;
  if (status != null) filters.status = status;
  if (window_start_from || window_start_to) {
    filters.window_start = {};
    if (window_start_from)
      (filters.window_start as any).gte = window_start_from;
    if (window_start_to) (filters.window_start as any).lte = window_start_to;
  }

  const skip = (page - 1) * limit;

  const [records, totalCount] = await Promise.all([
    MyGlobal.prisma.community_platform_voting_rate_limits.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { [order_by]: order_direction },
      include: { user: true },
    }),
    MyGlobal.prisma.community_platform_voting_rate_limits.count({
      where: filters,
    }),
  ]);

  const data = records.map((record) => ({
    id: record.id,
    user: record.user ? { id: record.user.id } : null,
    ip: typeof record.ip !== "undefined" ? record.ip : undefined,
    window_start: toISOStringSafe(record.window_start),
    window_end: toISOStringSafe(record.window_end),
    vote_count: record.vote_count,
    violation_count: record.violation_count,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
