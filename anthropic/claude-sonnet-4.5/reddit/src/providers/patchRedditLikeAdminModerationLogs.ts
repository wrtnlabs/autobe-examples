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

export async function patchRedditLikeAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IRedditLikeModerationLog.IRequest;
}): Promise<IPageIRedditLikeModerationLog> {
  const { admin, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_logs.findMany({
      where: {
        ...(body.log_type !== undefined && {
          log_type: body.log_type,
        }),
        ...(body.community_id !== undefined && {
          community_id: body.community_id,
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
        ...(body.log_type !== undefined && {
          log_type: body.log_type,
        }),
        ...(body.community_id !== undefined && {
          community_id: body.community_id,
        }),
      },
    }),
  ]);

  const data = logs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata === null ? undefined : log.metadata,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
