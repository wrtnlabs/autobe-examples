import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivityLog";
import { IRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformUserActivityLogs(props: {
  body: IRedditPlatformUserActivityLog.IRequest;
}): Promise<IPageIRedditPlatformUserActivityLog.ISummary> {
  // Query data with default ordering (most recent first)
  const data =
    await MyGlobal.prisma.reddit_platform_user_activity_logs.findMany({
      orderBy: { created_at: "desc" },
    });
  // Query total count
  const total =
    await MyGlobal.prisma.reddit_platform_user_activity_logs.count();
  // Transform database records to summary format
  const summaryData: IRedditPlatformUserActivityLog.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      user_id: record.user_id as string & tags.Format<"uuid">,
      community_id:
        record.community_id === null
          ? undefined
          : (record.community_id as string & tags.Format<"uuid">),
      post_id:
        record.post_id === null
          ? undefined
          : (record.post_id as string & tags.Format<"uuid">),
      comment_id:
        record.comment_id === null
          ? undefined
          : (record.comment_id as string & tags.Format<"uuid">),
      action_type: record.action_type,
      description: record.description === null ? undefined : record.description,
      occurred_at: toISOStringSafe(record.occurred_at),
      created_at: toISOStringSafe(record.created_at),
    }),
  );
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit: summaryData.length,
      records: total,
      pages: summaryData.length > 0 ? 1 : 0,
    },
  };
}
