import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformActivityLogsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformActivityLog> {
  const record =
    await MyGlobal.prisma.community_platform_activity_logs.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        user_id: true,
        action_type: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Activity Log not found", 404);
  }
  return {
    id: record.id,
    user_id: record.user_id ?? null,
    action_type: record.action_type,
    ip_address: record.ip_address ?? null,
    user_agent: record.user_agent ?? null,
    metadata: record.metadata ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ?? null,
  };
}
