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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditLikeAdminCommunitiesCommunityIdModerationLog(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeModerationLog.IRequest;
}): Promise<IPageIRedditLikeModerationLog> {
  const { admin, communityId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_logs.findMany({
      where: {
        community_id: communityId,
        ...(body.log_type !== undefined && {
          log_type: body.log_type,
        }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_moderation_logs.count({
      where: {
        community_id: communityId,
        ...(body.log_type !== undefined && {
          log_type: body.log_type,
        }),
      },
    }),
  ]);

  const data = logs.map((log) => ({
    id: log.id,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
