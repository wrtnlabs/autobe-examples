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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformModerationAuditLogAtSummaryTransformer } from "../transformers/RedditPlatformModerationAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogs(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformModerationAuditLog.IRequest;
}): Promise<IPageIRedditPlatformModerationAuditLog.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (community === null) {
    throw new HttpException("Not Found", 404);
  }
  const moderatorCheck =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (moderatorCheck === null) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_platform_moderation_audit_logsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (
    props.body.startDate !== undefined &&
    props.body.startDate !== null &&
    props.body.endDate !== undefined &&
    props.body.endDate !== null
  ) {
    const startDate = new Date(props.body.startDate);
    const endDate = new Date(props.body.endDate);
    if (startDate > endDate) {
      throw new HttpException(
        "Invalid date range: startDate cannot be after endDate",
        400,
      );
    }
    whereInput.created_at = {
      gte: startDate,
      lte: endDate,
    };
  } else if (
    props.body.startDate !== undefined &&
    props.body.startDate !== null
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
    };
  } else if (props.body.endDate !== undefined && props.body.endDate !== null) {
    whereInput.created_at = {
      lte: new Date(props.body.endDate),
    };
  }
  if (props.body.actionType !== undefined && props.body.actionType !== null) {
    whereInput.action_type = props.body.actionType;
  }
  if (props.body.moderatorId !== undefined && props.body.moderatorId !== null) {
    whereInput.moderator_id = props.body.moderatorId;
  }
  if (props.body.searchQuery !== undefined && props.body.searchQuery !== null) {
    whereInput.action_reason = {
      contains: props.body.searchQuery,
      mode: "insensitive",
    };
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const orderByInput: Prisma.reddit_platform_moderation_audit_logsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  let data: Array<
    Prisma.reddit_platform_moderation_audit_logsGetPayload<
      ReturnType<
        typeof RedditPlatformModerationAuditLogAtSummaryTransformer.select
      >
    >
  >;
  let total: number;
  let page: number = 1;
  let limit: number = 100;
  if (props.body.lastId !== undefined && props.body.lastId !== null) {
    whereInput.id = { lt: props.body.lastId };
    limit = props.body.limit ?? 100;
    if (limit < 1 || limit > 100) {
      throw new HttpException("Invalid limit: must be between 1 and 100", 400);
    }
    data = await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        take: limit + 1,
        ...RedditPlatformModerationAuditLogAtSummaryTransformer.select(),
      },
    );
    const hasMore = data.length > limit;
    data = hasMore ? data.slice(0, limit) : data;
    total = await MyGlobal.prisma.reddit_platform_moderation_audit_logs.count({
      where: whereInput,
    });
    page = 0;
  } else {
    page = props.body.page ?? 1;
    limit = props.body.limit ?? 100;
    if (page < 1) {
      throw new HttpException("Invalid page: must be at least 1", 400);
    }
    if (limit < 1 || limit > 100) {
      throw new HttpException("Invalid limit: must be between 1 and 100", 400);
    }
    const skip = (page - 1) * limit;
    [data, total] = await Promise.all([
      MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany({
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit,
        ...RedditPlatformModerationAuditLogAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.reddit_platform_moderation_audit_logs.count({
        where: whereInput,
      }),
    ]);
  }
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformModerationAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
