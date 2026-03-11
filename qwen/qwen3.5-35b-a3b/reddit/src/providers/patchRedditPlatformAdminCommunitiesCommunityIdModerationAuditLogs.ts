import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAuditLog";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModerationAuditLogAtSummaryTransformer } from "../transformers/RedditPlatformModerationAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminCommunitiesCommunityIdModerationAuditLogs(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformModerationAuditLog.IRequest;
}): Promise<IPageIRedditPlatformModerationAuditLog.ISummary> {
  // Authorization check: Verify admin is a moderator of the specified community
  const moderatorCheck =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.admin.id,
        },
      },
    });
  if (moderatorCheck === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build dynamic WHERE clause from filters
  const whereInput: Prisma.reddit_platform_moderation_audit_logsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.startDate && {
      created_at: { gte: props.body.startDate },
    }),
    ...(props.body.endDate && {
      created_at: { lte: props.body.endDate },
    }),
    ...(props.body.actionType && {
      action_type: props.body.actionType,
    }),
    ...(props.body.moderatorId && {
      moderator_id: props.body.moderatorId,
    }),
    ...(props.body.searchQuery && {
      action_reason: { contains: props.body.searchQuery },
    }),
    ...(props.body.lastId && {
      id: { lt: props.body.lastId },
    }),
  } satisfies Prisma.reddit_platform_moderation_audit_logsWhereInput;
  // Determine ORDER BY
  const orderByInput: Prisma.reddit_platform_moderation_audit_logsOrderByWithRelationInput =
    props.body.lastId
      ? { id: "asc" }
      : props.body.sortBy === "action_type"
        ? { action_type: props.body.sortOrder === "ASC" ? "asc" : "desc" }
        : props.body.sortBy === "moderator_id"
          ? { moderator_id: props.body.sortOrder === "ASC" ? "asc" : "desc" }
          : { created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" };
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query data with transformer select
  const data =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformModerationAuditLogAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(data, (log) =>
      RedditPlatformModerationAuditLogAtSummaryTransformer.transform(log),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
