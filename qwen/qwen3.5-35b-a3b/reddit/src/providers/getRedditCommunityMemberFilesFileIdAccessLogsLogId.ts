import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileAccessLogTransformer } from "../transformers/RedditCommunityFileAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberFilesFileIdAccessLogsLogId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileAccessLog> {
  const accessLog =
    await MyGlobal.prisma.reddit_community_file_access_logs.findUniqueOrThrow({
      where: { id: props.logId },
      select: {
        id: true,
        file: {
          select: { id: true },
        },
        actor: {
          select: { id: true },
        },
        actor_type: true,
        access_type: true,
        response_size: true,
        response_time_ms: true,
        status_code: true,
        referrer: true,
        user_agent: true,
        ip: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (accessLog.file.id !== props.fileId) {
    throw new HttpException("Access log file mismatch", 404);
  }
  return await RedditCommunityFileAccessLogTransformer.transform({
    id: accessLog.id,
    file: accessLog.file,
    actor: accessLog.actor,
    actor_type: accessLog.actor_type,
    access_type: accessLog.access_type,
    response_size: accessLog.response_size,
    response_time_ms: accessLog.response_time_ms,
    status_code: accessLog.status_code,
    referrer: accessLog.referrer,
    user_agent: accessLog.user_agent,
    ip: accessLog.ip,
    created_at: accessLog.created_at,
    updated_at: accessLog.updated_at,
    deleted_at: accessLog.deleted_at,
  });
}
