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

export async function patchRedditLikeModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerationLog.IRequest;
}): Promise<IPageIRedditLikeModerationLog> {
  const { moderator, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(body.log_type !== undefined &&
      body.log_type !== null && {
        log_type: body.log_type,
      }),
    ...(body.community_id !== undefined &&
      body.community_id !== null && {
        community_id: body.community_id,
      }),
  };

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_logs.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_moderation_logs.count({
      where: whereCondition,
    }),
  ]);

  const data = logs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
