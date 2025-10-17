import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditLikeModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerationLog.IRequest;
}): Promise<IPageIRedditLikeModerationLog> {
  const { moderator, body } = props;

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // AUTHORIZATION: Get communities moderator has access to
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        moderator_id: moderator.id,
      },
      select: {
        community_id: true,
      },
    });

  const accessibleCommunityIds = moderatorCommunities.map(
    (mc) => mc.community_id,
  );

  // If no communities accessible, return empty results
  if (accessibleCommunityIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // If specific community_id requested, verify access
  if (body.community_id !== undefined && body.community_id !== null) {
    if (!accessibleCommunityIds.includes(body.community_id)) {
      throw new HttpException(
        "Unauthorized: You do not moderate this community",
        403,
      );
    }
  }

  // Build where clause - use specific community_id if provided, otherwise filter by accessible communities
  const communityFilter =
    body.community_id !== undefined && body.community_id !== null
      ? body.community_id
      : { in: accessibleCommunityIds };

  // Execute parallel queries
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_logs.findMany({
      where: {
        community_id: communityFilter,
        ...(body.log_type !== undefined &&
          body.log_type !== null && {
            log_type: body.log_type,
          }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
      select: {
        id: true,
        log_type: true,
        action_description: true,
        metadata: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_like_moderation_logs.count({
      where: {
        community_id: communityFilter,
        ...(body.log_type !== undefined &&
          body.log_type !== null && {
            log_type: body.log_type,
          }),
      },
    }),
  ]);

  // Transform logs to API response format
  const data: IRedditLikeModerationLog[] = logs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
