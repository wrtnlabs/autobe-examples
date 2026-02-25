import { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemNotificationBroadcastDeliveryTransformer } from "../transformers/CommunityPlatformSystemNotificationBroadcastDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminSystemNotificationsSystemNotificationIdBroadcastDeliveriesDeliveryId(props: {
  admin: AdminPayload;
  systemNotificationId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate;
}): Promise<ICommunityPlatformSystemNotificationBroadcastDelivery> {
  // 1. Find existing delivery record and verify it belongs to specified notification
  const existing =
    await MyGlobal.prisma.community_platform_system_notification_broadcast_deliveries.findUniqueOrThrow(
      {
        where: {
          id: props.deliveryId,
          system_notification_id: props.systemNotificationId,
        },
      },
    );
  // 2. Prepare new values with defaults
  const newDelivered = props.body.delivered_count ?? existing.delivered_count;
  const newFailed = props.body.failed_count ?? existing.failed_count;
  const total = existing.total_recipients;
  // 3. Business validation: individual count minimums
  if (
    props.body.delivered_count !== undefined &&
    props.body.delivered_count < 0
  ) {
    throw new HttpException("delivered_count must be non-negative", 400);
  }
  if (props.body.failed_count !== undefined && props.body.failed_count < 0) {
    throw new HttpException("failed_count must be non-negative", 400);
  }
  // 4. Business validation: counts consistency
  if (newDelivered + newFailed > total) {
    throw new HttpException(
      "Delivered count plus failed count cannot exceed total recipients",
      400,
    );
  }
  // 5. Helper function for nullable date conversion
  const toNullableDate = (
    value: (string & tags.Format<"date-time">) | null | undefined,
  ): Date | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new HttpException(`Invalid date format: ${value}`, 400);
    }
    return date;
  };
  // 6. Prepare update data
  const updateData: Prisma.community_platform_system_notification_broadcast_deliveriesUpdateInput =
    {
      ...(props.body.delivery_status !== undefined && {
        delivery_status: props.body.delivery_status,
      }),
      ...(props.body.delivered_count !== undefined && {
        delivered_count: props.body.delivered_count,
      }),
      ...(props.body.failed_count !== undefined && {
        failed_count: props.body.failed_count,
      }),
      ...(props.body.scheduled_at !== undefined && {
        scheduled_at: toNullableDate(props.body.scheduled_at),
      }),
      ...(props.body.started_at !== undefined && {
        started_at: toNullableDate(props.body.started_at),
      }),
      ...(props.body.completed_at !== undefined && {
        completed_at: toNullableDate(props.body.completed_at),
      }),
      ...(props.body.error_message !== undefined && {
        error_message: props.body.error_message,
      }),
      updated_at: new Date(),
    };
  // 7. Perform update
  await MyGlobal.prisma.community_platform_system_notification_broadcast_deliveries.update(
    {
      where: { id: props.deliveryId },
      data: updateData,
    },
  );
  // 8. Fetch updated record with transformer selection
  const updated =
    await MyGlobal.prisma.community_platform_system_notification_broadcast_deliveries.findUniqueOrThrow(
      {
        where: { id: props.deliveryId },
        ...CommunityPlatformSystemNotificationBroadcastDeliveryTransformer.select(),
      },
    );
  // 9. Transform and return
  return await CommunityPlatformSystemNotificationBroadcastDeliveryTransformer.transform(
    updated,
  );
}
