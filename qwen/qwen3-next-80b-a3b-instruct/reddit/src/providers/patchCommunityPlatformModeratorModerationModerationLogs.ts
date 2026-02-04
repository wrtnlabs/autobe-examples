import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModerationLogTransformer } from "../transformers/CommunityPlatformModerationLogTransformer";

export async function patchCommunityPlatformModeratorModerationModerationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog> {
  const page = props.body.page ?? 1;
  const perPage = props.body.perPage ?? 100;
  const skip = (page - 1) * perPage;
  // Validate page and perPage constraints (trust system - already validated by controller)
  // Per spec: 1 <= page, 1 <= perPage <= 1000
  // Construct where condition
  const whereInput: Prisma.community_platform_moderation_logsWhereInput = {
    moderator_id: props.moderator.id, // Moderator can only see their own logs
    ...(props.body.from && { created_at: { gte: props.body.from } }),
    ...(props.body.to && { created_at: { lte: props.body.to } }),
    ...(props.body.moderatorId && { moderator_id: props.body.moderatorId }),
    ...(props.body.targetId && { target_id: props.body.targetId }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.status && { status: props.body.status }),
  };
  // Query data with transformer's select to get all needed fields
  const data =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where: whereInput,
      skip,
      take: perPage,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformModerationLogTransformer.select(),
    });
  // Count total records (use same where clause)
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where: whereInput,
  });
  // Transform data using asyncMap
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformModerationLogTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    } satisfies IPage.IPagination,
  };
}
