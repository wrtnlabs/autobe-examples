import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
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

export async function postShoppingMallCustomerNotificationsResendFailed(props: {
  customer: CustomerPayload;
  body: IShoppingMall.IRequest;
}): Promise<IShoppingMall.IResponse> {
  // Extract criteria from request body, handle optional filters
  const templateIds = (props.body as any).templateIds as
    | (string & tags.Format<"uuid">)[]
    | undefined;
  const userNotificationIds = (props.body as any).userNotificationIds as
    | (string & tags.Format<"uuid">)[]
    | undefined;
  // Build where clause for filtering deliveries
  const whereDelivery = {
    status: "failed",
    deleted_at: null,
    userNotification: {
      owner_id: props.customer.id,
      owner_type: "customer",
      deleted_at: null,
      ...(userNotificationIds ? { id: { in: userNotificationIds } } : {}),
      ...(templateIds ? { notification_template_id: { in: templateIds } } : {}),
    },
  } satisfies Prisma.shopping_mall_notification_deliveriesWhereInput;
  // Query failed deliveries with userNotification and notificationTemplate relations
  const failedDeliveries =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findMany({
      where: whereDelivery,
      include: {
        userNotification: true,
        notificationTemplate: true,
      },
    });
  let total = 0;
  let retried = 0;
  let skipped = 0;
  let failed = 0;
  for (const delivery of failedDeliveries) {
    total++;
    try {
      const now = toISOStringSafe(new Date());
      // Update delivery status and timestamps
      await MyGlobal.prisma.shopping_mall_notification_deliveries.update({
        where: { id: delivery.id },
        data: {
          status: "sent",
          attempted_at: now,
          updated_at: now,
        },
      });
      // Create a log record for the resend attempt
      await MyGlobal.prisma.shopping_mall_notification_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          notification_template_id: delivery.notification_template_id,
          user_notification_id: delivery.shopping_mall_user_notification_id,
          event_type: "resent",
          event_metadata: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      retried++;
    } catch {
      failed++;
    }
  }
  return {
    total,
    retried,
    skipped,
    failed,
    timestamp: toISOStringSafe(new Date()),
  };
}
