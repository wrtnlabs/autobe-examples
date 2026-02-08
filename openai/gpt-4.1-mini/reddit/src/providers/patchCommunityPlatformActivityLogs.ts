import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformActivityLogs(props: {
  body: ICommunityPlatformActivityLog.IRequest;
}): Promise<IPageICommunityPlatformActivityLog.ISummary> {
  const page =
    "page" in props.body && typeof props.body.page === "number"
      ? props.body.page
      : 1;
  const limit =
    "limit" in props.body && typeof props.body.limit === "number"
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_activity_logsWhereInput = {};
  if ("user_id" in props.body && typeof props.body.user_id === "string") {
    where.user_id = props.body.user_id;
  }
  if (
    "action_type" in props.body &&
    typeof props.body.action_type === "string"
  ) {
    where.action_type = props.body.action_type;
  }
  if (
    ("created_at_from" in props.body &&
      typeof props.body.created_at_from === "string") ||
    ("created_at_to" in props.body &&
      typeof props.body.created_at_to === "string")
  ) {
    // Initialize with partial Prisma.DateTimeFilter compatible object
    where.created_at = {} as Prisma.DateTimeFilter;
    if (
      "created_at_from" in props.body &&
      typeof props.body.created_at_from === "string"
    ) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (
      "created_at_to" in props.body &&
      typeof props.body.created_at_to === "string"
    ) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  if ("ip_address" in props.body && typeof props.body.ip_address === "string") {
    where.ip_address = props.body.ip_address;
  }
  const data = await MyGlobal.prisma.community_platform_activity_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_platform_activity_logs.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      user_id: record.user_id ?? null,
      action_type: record.action_type,
      ip_address: record.ip_address ?? null,
      created_at:
        typeof record.created_at === "string"
          ? record.created_at
          : toISOStringSafe(record.created_at),
      updated_at:
        typeof record.updated_at === "string"
          ? record.updated_at
          : toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
