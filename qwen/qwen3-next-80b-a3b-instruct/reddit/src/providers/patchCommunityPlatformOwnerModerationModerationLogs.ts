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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformModerationLogTransformer } from "../transformers/CommunityPlatformModerationLogTransformer";

export async function patchCommunityPlatformOwnerModerationModerationLogs(props: {
  owner: OwnerPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog> {
  const page = props.body.page ?? 1;
  const perPage = props.body.perPage ?? 20;
  const skip = (page - 1) * perPage;
  // Build dynamic where clause with all possible filters
  const whereInput = {
    ...((props.body.from || props.body.to) && {
      created_at: {
        ...(props.body.from && { gte: props.body.from }),
        ...(props.body.to && { lte: props.body.to }),
      },
    }),
    ...(props.body.moderatorId && { moderator_id: props.body.moderatorId }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.status && { status: props.body.status }),
    // Handle target filtering based on target_entity_type
    ...(props.body.targetId &&
      (props.body.actionType === "delete" || !props.body.actionType) && {
        targetComment: { id: props.body.targetId },
      }),
    ...(props.body.targetId &&
      (props.body.actionType === "approve" ||
        props.body.actionType === "dismiss" ||
        !props.body.actionType) && {
        targetReport: { id: props.body.targetId },
      }),
    ...(props.body.targetId &&
      (props.body.actionType === "ban" || !props.body.actionType) && {
        targetBan: { id: props.body.targetId },
      }),
  } satisfies Prisma.community_platform_moderation_logsWhereInput;
  // Fetch moderated logs with all required relationships
  const data =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where: whereInput,
      skip,
      take: perPage,
      orderBy: [
        { created_at: "desc" },
        { action_type: "asc" },
        { moderator_id: "asc" },
      ],
      ...CommunityPlatformModerationLogTransformer.select(),
    });
  // Count total matching records using same where clause
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where: whereInput,
  });
  // Transform each log entry using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationLogTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    } satisfies IPage.IPagination,
  };
}
