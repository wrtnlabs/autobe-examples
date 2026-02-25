import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationActionLogAtSummaryTransformer } from "../transformers/CommunityPlatformModerationActionLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminModerationActionLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationActionLog.IRequest;
}): Promise<IPageICommunityPlatformModerationActionLog.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all optional filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.moderator_id && { moderator_id: props.body.moderator_id }),
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_user_id && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_post_id && {
      target_post_id: props.body.target_post_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
    ...(props.body.updated_at_start && {
      updated_at: {
        gte: new Date(props.body.updated_at_start),
      },
    }),
    ...(props.body.updated_at_end && {
      updated_at: {
        lte: new Date(props.body.updated_at_end),
      },
    }),
  } satisfies Prisma.community_platform_moderation_action_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_action_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformModerationActionLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_moderation_action_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationActionLogAtSummaryTransformer.transform,
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
