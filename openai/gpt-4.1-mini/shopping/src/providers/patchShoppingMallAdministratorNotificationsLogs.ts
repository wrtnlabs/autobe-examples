import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotificationsLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationLog.IRequest;
}): Promise<IPageIShoppingMallNotificationLog.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const whereClause: Prisma.shopping_mall_notification_logsWhereInput = {};
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_notification_logs.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        event_type: true,
        event_metadata: true,
        notification_template_id: true,
        user_notification_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_notification_logs.count({
      where: whereClause,
    }),
  ]);
  const data: IShoppingMallNotificationLog.ISummary[] = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    event_type: row.event_type,
    metadata: row.event_metadata ?? null,
    notification_template_id: row.notification_template_id ?? null,
    user_notification_id: row.user_notification_id ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: row.updated_at ? toISOStringSafe(row.updated_at) : null,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
