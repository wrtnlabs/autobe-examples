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

export async function putCommunityPlatformActivityLogsId(props: {
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformActivityLog.IUpdate;
}): Promise<ICommunityPlatformActivityLog> {
  const existing =
    await MyGlobal.prisma.community_platform_activity_logs.findUnique({
      where: { id: props.id },
    });
  if (!existing) {
    throw new HttpException("Activity log not found", 404);
  }
  const updated = await MyGlobal.prisma.community_platform_activity_logs.update(
    {
      where: { id: props.id },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return {
    id: updated.id,
    user_id: updated.user_id ?? null,
    action_type: updated.action_type,
    ip_address: updated.ip_address ?? null,
    user_agent: updated.user_agent ?? null,
    metadata: updated.metadata ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
