import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemHealthLogTransformer } from "../transformers/RedditCommunitySystemHealthLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunitySystemHealthLogsHealthLogId(props: {
  healthLogId: string;
}): Promise<IRedditCommunitySystemHealthLog> {
  if (!typia.is<string & tags.Format<"uuid">>(props.healthLogId)) {
    throw new HttpException("Invalid UUID format", 400);
  }
  const log =
    await MyGlobal.prisma.reddit_community_system_health_logs.findUnique({
      where: { id: props.healthLogId },
      ...RedditCommunitySystemHealthLogTransformer.select(),
    });
  if (!log || log.deleted_at !== null) {
    throw new HttpException("System health log not found", 404);
  }
  return RedditCommunitySystemHealthLogTransformer.transform(log);
}
