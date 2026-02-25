import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneModerationLogAtSummaryTransformer } from "../transformers/RedditCloneModerationLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerAuditLogs(props: {
  owner: OwnerPayload;
  body: IRedditCloneModerationLog.IRequest;
}): Promise<IPageIRedditCloneModerationLog.ISummary> {
  // Parse pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const where: Prisma.reddit_clone_moderation_logsWhereInput = {
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.moderatorId && { moderator_id: props.body.moderatorId }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.targetType && { target_type: props.body.targetType }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason },
    }),
  };
  // Execute paginated query
  const data = await MyGlobal.prisma.reddit_clone_moderation_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.sortOrder ?? "desc",
    },
    include: {
      moderator: true,
      post: true,
      comment: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_moderation_logs.count({
    where,
  });
  // Transform using the existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneModerationLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
