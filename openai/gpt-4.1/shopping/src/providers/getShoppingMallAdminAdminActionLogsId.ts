import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminActionLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminActionLog> {
  const log = await MyGlobal.prisma.shopping_mall_admin_action_logs.findUnique({
    where: { id: props.id },
  });

  if (!log) {
    throw new HttpException("Admin action log not found", 404);
  }

  return {
    id: log.id,
    shopping_mall_admin_id: log.shopping_mall_admin_id,
    action_type: log.action_type,
    context_info: log.context_info !== undefined ? log.context_info : undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
