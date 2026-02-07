import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminLogsLogId(props: {
  admin: AdminPayload;
  logId: string;
}): Promise<IShoppingMallSystematicLog> {
  const log = await MyGlobal.prisma.shopping_mall_systematic_logs.findUnique({
    where: { id: props.logId },
  });
  if (!log) {
    throw new HttpException("Log not found", 404);
  }
  return {
    id: log.id,
    created_at: log.created_at,
    severity: log.severity,
    component: log.component,
    message: log.message,
    context: log.context,
    trace_id: log.trace_id,
    user_id: log.user_id,
    ip: log.ip,
    method: log.method,
    path: log.path,
    status_code: log.status_code,
    duration_ms: log.duration_ms,
    stack_trace: log.stack_trace,
  };
}
