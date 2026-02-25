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

export async function getCommunityPlatformAdminSystemNotificationsSystemNotificationIdBroadcastDeliveriesDeliveryId(props: {
  admin: AdminPayload;
  systemNotificationId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemNotificationBroadcastDelivery> {
  // Verify the delivery exists and belongs to the specified system notification
  const delivery =
    await MyGlobal.prisma.community_platform_system_notification_broadcast_deliveries.findUniqueOrThrow(
      {
        where: {
          id: props.deliveryId,
          system_notification_id: props.systemNotificationId,
        },
        ...CommunityPlatformSystemNotificationBroadcastDeliveryTransformer.select(),
      },
    );
  // Transform the database record to API response
  return await CommunityPlatformSystemNotificationBroadcastDeliveryTransformer.transform(
    delivery,
  );
}
