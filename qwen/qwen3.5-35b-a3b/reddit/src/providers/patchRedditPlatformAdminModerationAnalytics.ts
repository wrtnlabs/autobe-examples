import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModerationAuditLogTransformer } from "../transformers/RedditPlatformModerationAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminModerationAnalytics(props: {
  admin: AdminPayload;
  body: IRedditPlatformModerationAuditLog.IRequest;
}): Promise<IRedditPlatformModerationAuditLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const validatedPage: number & tags.Type<"int32"> & tags.Minimum<1> =
    page >= 1 ? page : 1;
  const validatedLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = limit > 0 && limit <= 100 ? limit : 100;
  const whereInput: Prisma.reddit_platform_moderation_audit_logsWhereInput = {
    deleted_at: null,
  };
  if (props.body.community_ids && props.body.community_ids.length > 0) {
    const adminModeratedCommunities =
      await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
        where: {
          user_id: props.admin.id,
          community_id: { in: props.body.community_ids },
        },
        select: { community_id: true },
      });
    const authorizedCommunityIds = adminModeratedCommunities.map(
      (m) => m.community_id,
    );
    const unauthorizedCommunityIds = props.body.community_ids.filter(
      (id) => !authorizedCommunityIds.includes(id),
    );
    if (unauthorizedCommunityIds.length > 0) {
      throw new HttpException("Access denied to one or more communities", 403);
    }
    whereInput.community_id = { in: authorizedCommunityIds };
  }
  if (props.body.moderator_id) {
    whereInput.moderator_id = props.body.moderator_id;
  }
  if (props.body.date_range) {
    whereInput.created_at = {
      gte: new Date(props.body.date_range.start_date),
      lte: new Date(props.body.date_range.end_date),
    };
  }
  if (props.body.search) {
    whereInput.OR = [
      { action_reason: { contains: props.body.search, mode: "insensitive" } },
      { action_details: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const auditLogs =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany({
      where: whereInput,
      skip,
      take: validatedLimit,
      orderBy: {
        created_at: props.body.sort?.direction === "asc" ? "asc" : "desc",
      },
      ...RedditPlatformModerationAuditLogTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.count({
      where: whereInput,
    });
  const transformedLogs = await ArrayUtil.asyncMap(
    auditLogs,
    RedditPlatformModerationAuditLogTransformer.transform,
  );
  return {
    id: transformedLogs[0]?.id ?? "00000000-0000-0000-0000-000000000000",
    moderator:
      transformedLogs[0]?.moderator ??
      typia.random<IRedditPlatformMember.ISummary>(),
    community:
      transformedLogs[0]?.community ??
      typia.random<IRedditPlatformCommunity.ISummary>(),
    actionTargetPost: transformedLogs[0]?.actionTargetPost ?? null,
    actionTargetComment: transformedLogs[0]?.actionTargetComment ?? null,
    actionTargetUser: transformedLogs[0]?.actionTargetUser ?? null,
    action_type: transformedLogs[0]?.action_type ?? "unknown",
    action_target_type: transformedLogs[0]?.action_target_type ?? "unknown",
    action_target_id: transformedLogs[0]?.action_target_id ?? null,
    action_reason: transformedLogs[0]?.action_reason ?? null,
    action_details: transformedLogs[0]?.action_details ?? null,
    created_at: transformedLogs[0]?.created_at ?? new Date().toISOString(),
    updated_at: transformedLogs[0]?.updated_at ?? new Date().toISOString(),
    deleted_at: transformedLogs[0]?.deleted_at ?? null,
  };
}
