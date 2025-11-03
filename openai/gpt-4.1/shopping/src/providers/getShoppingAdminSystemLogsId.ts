import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminSystemLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingSystemLog> {
  const log = await MyGlobal.prisma.shopping_system_logs.findFirst({
    where: {
      id: props.id,
    },
  });
  if (!log) {
    throw new HttpException("System log not found", 404);
  }
  return {
    id: log.id,
    event_time: toISOStringSafe(log.event_time),
    log_level: log.log_level,
    event_type: log.event_type,
    event_source: log.event_source,
    message: log.message,
    details: log.details ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
