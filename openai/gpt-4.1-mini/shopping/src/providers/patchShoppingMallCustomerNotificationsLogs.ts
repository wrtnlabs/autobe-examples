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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerNotificationsLogs(props: {
  customer: CustomerPayload;
  body: IShoppingMallNotificationLog.IRequest;
}): Promise<IPageIShoppingMallNotificationLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  const data = await MyGlobal.prisma.shopping_mall_notification_logs.findMany({
    where,
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
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_notification_logs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      event_type: item.event_type,
      event_metadata: item.event_metadata,
      notification_template_id: item.notification_template_id,
      user_notification_id: item.user_notification_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
