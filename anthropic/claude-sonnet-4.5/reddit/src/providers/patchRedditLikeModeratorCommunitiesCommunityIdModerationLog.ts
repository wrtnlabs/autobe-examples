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

export async function patchRedditLikeModeratorCommunitiesCommunityIdModerationLog(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeModerationLog.IRequest;
}): Promise<IPageIRedditLikeModerationLog> {
  const { moderator, communityId, body } = props;

  // Verify moderator has access to this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Execute concurrent queries
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_logs.findMany({
      where: {
        community_id: communityId,
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
    }),
    MyGlobal.prisma.reddit_like_moderation_logs.count({
      where: {
        community_id: communityId,
        ...(body.log_type !== undefined &&
          body.log_type !== null && {
            log_type: body.log_type,
          }),
      },
    }),
  ]);

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  // Transform to API response format
  const data: IRedditLikeModerationLog[] = logs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
