import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationQueueAtSummaryTransformer } from "../transformers/CommunityPlatformModerationQueueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminModerationQueues(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationQueue.IRequest;
}): Promise<IPageICommunityPlatformModerationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper null handling - filter out null values
  const whereInput: Prisma.community_platform_moderation_queuesWhereInput = {
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.priority !== undefined &&
      props.body.priority !== null && { priority: props.body.priority }),
    ...(props.body.moderator_id !== undefined &&
      props.body.moderator_id !== null && {
        community_platform_moderator_id: props.body.moderator_id,
      }),
    ...(props.body.post_id !== undefined &&
      props.body.post_id !== null && {
        community_platform_post_id: props.body.post_id,
      }),
    ...(props.body.comment_id !== undefined &&
      props.body.comment_id !== null && {
        community_platform_comment_id: props.body.comment_id,
      }),
  };
  // Get paginated data
  const data =
    await MyGlobal.prisma.community_platform_moderation_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformModerationQueueAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_moderation_queues.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModerationQueueAtSummaryTransformer.transform,
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
