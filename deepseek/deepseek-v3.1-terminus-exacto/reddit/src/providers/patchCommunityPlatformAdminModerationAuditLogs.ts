import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationAuditLogAtSummaryTransformer } from "../transformers/CommunityPlatformModerationAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminModerationAuditLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationAuditLog.IRequest;
}): Promise<IPageICommunityPlatformModerationAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.moderator_id !== undefined &&
      props.body.moderator_id !== null && {
        moderator_id: props.body.moderator_id,
      }),
    ...(props.body.target_user_id !== undefined &&
      props.body.target_user_id !== null && {
        target_user_id: props.body.target_user_id,
      }),
    ...(props.body.target_community_id !== undefined &&
      props.body.target_community_id !== null && {
        target_community_id: props.body.target_community_id,
      }),
    ...(props.body.target_post_id !== undefined &&
      props.body.target_post_id !== null && {
        target_post_id: props.body.target_post_id,
      }),
    ...(props.body.target_comment_id !== undefined &&
      props.body.target_comment_id !== null && {
        target_comment_id: props.body.target_comment_id,
      }),
    ...(props.body.action_type !== undefined && {
      action_type: { contains: props.body.action_type },
    }),
    ...(props.body.action_details !== undefined && {
      action_details: { contains: props.body.action_details },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.community_platform_moderation_audit_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformModerationAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_moderation_audit_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationAuditLogAtSummaryTransformer.transform,
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
