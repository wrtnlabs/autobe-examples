import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAbuseFlag";
import { IPageICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingAbuseFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorVotingAbuseFlags(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformVotingAbuseFlag.IRequest;
}): Promise<IPageICommunityPlatformVotingAbuseFlag.ISummary> {
  const body = props.body;
  // Build where clause based on filters in body
  const where = {
    ...(body.user_id !== undefined && {
      community_platform_user_id: body.user_id,
    }),
    ...(body.ip !== undefined && {
      ip: body.ip,
    }),
    ...(body.violation_type !== undefined && {
      violation_type: body.violation_type,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    // created_at range
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }
      : {}),
    // resolved_at range
    ...(body.resolved_from || body.resolved_to
      ? {
          resolved_at: {
            ...(body.resolved_from && { gte: body.resolved_from }),
            ...(body.resolved_to && { lte: body.resolved_to }),
          },
        }
      : {}),
  };

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Ordering
  let orderBy;
  if (body.order_by) {
    const orderByParts = body.order_by.trim().split(" ");
    if (
      orderByParts.length === 2 &&
      ["asc", "desc"].includes(orderByParts[1].toLowerCase())
    ) {
      orderBy = {
        [orderByParts[0]]:
          orderByParts[1].toLowerCase() === "desc"
            ? Prisma.SortOrder.desc
            : Prisma.SortOrder.asc,
      };
    } else {
      // fallback
      orderBy = { created_at: Prisma.SortOrder.desc };
    }
  } else {
    orderBy = { created_at: Prisma.SortOrder.desc };
  }

  // Query DB for page of flags and total count
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.community_platform_voting_abuse_flags.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_voting_abuse_flags.count({
      where,
    }),
  ]);

  // Map DB rows to ISummary for API
  const data = rows.map((row) => ({
    id: row.id,
    community_platform_user_id: row.community_platform_user_id ?? undefined,
    ip: row.ip ?? undefined,
    violation_type: row.violation_type,
    status: row.status,
    note: row.note ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data,
  };
}
