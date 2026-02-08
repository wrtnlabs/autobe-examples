import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
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

export async function patchCommunityPlatformAdminModerationLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog.ISummary> {
  const page =
    "page" in props.body &&
    typeof props.body.page === "number" &&
    props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    "limit" in props.body &&
    typeof props.body.limit === "number" &&
    props.body.limit > 0
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  // Helper function to safely pick string | undefined
  function safeString(key: string): string | undefined {
    const value = (props.body as any)[key];
    return typeof value === "string" ? value : undefined;
  }
  // Helper function to safely pick Date filters and convert to string filters
  function safeDateFilter(
    gteKey: string,
    lteKey: string,
  ):
    | {
        gte?: string;
        lte?: string;
      }
    | undefined {
    const gteRaw = (props.body as any)[gteKey];
    const lteRaw = (props.body as any)[lteKey];
    const gte =
      gteRaw instanceof Date
        ? toISOStringSafe(gteRaw)
        : typeof gteRaw === "string"
          ? toISOStringSafe(new Date(gteRaw))
          : undefined;
    const lte =
      lteRaw instanceof Date
        ? toISOStringSafe(lteRaw)
        : typeof lteRaw === "string"
          ? toISOStringSafe(new Date(lteRaw))
          : undefined;
    if (gte === undefined && lte === undefined) return undefined;
    return { gte, lte };
  }
  const where = {
    moderator_id: safeString("moderator_id"),
    action_type: safeString("action_type"),
    post_id: safeString("post_id"),
    comment_id: safeString("comment_id"),
    created_at: safeDateFilter("created_at_gte", "created_at_lte"),
    updated_at: safeDateFilter("updated_at_gte", "updated_at_lte"),
    deleted_at: null,
  } satisfies Prisma.community_platform_moderation_logsWhereInput;
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where,
  });
  const records =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        moderator_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      moderator_id: record.moderator_id,
      post_id: record.post_id ?? null,
      comment_id: record.comment_id ?? null,
      action_type: record.action_type,
      action_details: record.action_details ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
