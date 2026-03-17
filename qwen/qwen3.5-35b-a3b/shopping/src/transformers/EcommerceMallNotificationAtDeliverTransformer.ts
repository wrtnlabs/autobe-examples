import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallNotificationAtDeliverTransformer {
  export type Payload = Prisma.ecommerce_mall_notificationsGetPayload<{
    select: {
      title: true;
      body: true;
      type: true;
      recipients: {
        select: {
          recipient_type: true;
          recipient_id: true;
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        title: true,
        body: true,
        type: true,
        recipients: {
          select: {
            recipient_type: true,
            recipient_id: true,
          },
        } satisfies Prisma.ecommerce_mall_notification_recipientsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallNotification.IDeliver> {
    return {
      title: input.title,
      body: input.body,
      type: typia.assert<
        | "order_update"
        | "seller_approval"
        | "platform_announcement"
        | "system_alert"
      >(input.type),
      recipients: await ArrayUtil.asyncMap(input.recipients, async (r) => ({
        recipient_type: typia.assert<
          "customer" | "seller" | "admin" | "superAdmin" | "guest"
        >(r.recipient_type),
        recipient_id: r.recipient_id,
      })),
    };
  }
}
