import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformActivityLogCollector } from "../collectors/CommunityPlatformActivityLogCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformActivityLogs(props: {
  body: ICommunityPlatformActivityLog.ICreate;
}): Promise<ICommunityPlatformActivityLog> {
  const created = await MyGlobal.prisma.community_platform_activity_logs.create(
    {
      data: await CommunityPlatformActivityLogCollector.collect({
        body: props.body,
      }),
    },
  );
  return {
    id: created.id,
    user_id: created.user_id ?? null,
    action_type: created.action_type,
    ip_address: created.ip_address ?? null,
    user_agent: created.user_agent ?? null,
    metadata: created.metadata ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
