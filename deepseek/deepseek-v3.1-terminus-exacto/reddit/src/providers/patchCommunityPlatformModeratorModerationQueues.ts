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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModerationQueueAtSummaryTransformer } from "../transformers/CommunityPlatformModerationQueueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorModerationQueues(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationQueue.IRequest;
}): Promise<IPageICommunityPlatformModerationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get moderator's assigned communities for authorization
  const moderatorAssignments =
    await MyGlobal.prisma.community_platform_moderator_assignments.findMany({
      where: {
        assigned_user_id: props.moderator.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const authorizedCommunityIds = moderatorAssignments.map(
    (assignment) => assignment.community_id,
  );
  // Build WHERE clause with filters and authorization
  const whereInput = {
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: { equals: props.body.status },
      }),
    ...(props.body.priority !== undefined &&
      props.body.priority !== null && {
        priority: { equals: props.body.priority },
      }),
    ...(props.body.moderator_id !== undefined &&
      props.body.moderator_id !== null && {
        moderator_id: { equals: props.body.moderator_id },
      }),
    ...(props.body.post_id !== undefined &&
      props.body.post_id !== null && {
        post_id: { equals: props.body.post_id },
      }),
    ...(props.body.comment_id !== undefined &&
      props.body.comment_id !== null && {
        comment_id: { equals: props.body.comment_id },
      }),
    // Authorization: only show queues for posts/comments in moderator's communities
    OR: [
      {
        post: {
          community_id: { in: authorizedCommunityIds },
        },
      },
      {
        comment: {
          post: {
            community_id: { in: authorizedCommunityIds },
          },
        },
      },
    ],
  } satisfies Prisma.community_platform_moderation_queuesWhereInput;
  // Query moderation queues with pagination
  const data =
    await MyGlobal.prisma.community_platform_moderation_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformModerationQueueAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_moderation_queues.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformModerationQueueAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
