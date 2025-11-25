import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminDataChangeLogs(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallDataChangeLog> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // No filtering query parameters in props — only admin auth
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_data_change_logs.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_data_change_logs.count(),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((log) => ({
      entityId: (log.entity_id || "") satisfies string as string,
      entityType: log.entity_type,
      operationType: typia.assert<"create" | "delete" | "update">(
        log.change_type,
      ),
      oldValue: log.old_value
        ? (() => {
            try {
              return JSON.parse(log.old_value);
            } catch {
              return undefined;
            }
          })()
        : undefined,
      newValue: log.new_value
        ? (() => {
            try {
              return JSON.parse(log.new_value);
            } catch {
              return undefined;
            }
          })()
        : undefined,
      changedBy: log.actor_id || log.actor_type,
      changedAt: toISOStringSafe(log.created_at),
    })),
  };
}
