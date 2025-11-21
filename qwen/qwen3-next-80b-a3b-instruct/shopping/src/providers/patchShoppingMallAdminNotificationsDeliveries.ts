import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminNotificationsDeliveries(props: {
  admin: AdminPayload;
  body: IShoppingMallNotificationDelivery.IRequest;
}): Promise<IPageIShoppingMallNotificationDelivery> {
  const {
    start_date,
    end_date,
    status,
    delivery_channel,
    template_id,
    queue_id,
    error_code,
    page,
    limit,
  } = props.body;

  // Build where conditions using inline approach with exact Prisma field names
  const where: any = {
    deleted_at: null,
    status,
    delivery_channel,
    template_id,
    queue_id,
  };

  // Handle error_code: must be undefined if null per DTO interface
  if (error_code !== undefined) {
    where.error_code = error_code;
  }

  // Add date range conditions using created_at (Prisma schema field)
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) where.created_at.gte = start_date;
    if (end_date) where.created_at.lte = end_date;
  }

  const skip = page * limit;
  const take = limit;

  const [deliveries, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_notification_deliveries.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_notification_deliveries.count({ where }),
  ]);

  return {
    pagination: {
      current: page + 1, // Convert 0-based page to 1-based for response
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: deliveries.map((delivery) => {
      return {
        gateway_response: delivery.gateway_response ?? undefined,
        error_code: delivery.error_code ?? undefined,
        delivered_at: delivery.delivered_at
          ? toISOStringSafe(delivery.delivered_at)
          : undefined,
      };
    }),
  };
}
