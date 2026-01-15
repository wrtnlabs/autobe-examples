import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentNotificationTransformer {
  export type Payload = Prisma.shopping_mall_payment_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        template: true,
        notification_type: true,
        recipient_id: true,
        recipient_type: true,
        status: true,
        sent_at: true,
        read_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentNotification> {
    return {
      id: input.id,
      type: input.notification_type,
      status: input.status,
      message: input.read_at?.toISOString() ?? undefined,
      payment_id: input.recipient_id,
      created_at: input.sent_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      error_code: input.template,
      retry_attempts: undefined,
      delivery_channel: input.recipient_type,
      delivery_details: input.created_at.toISOString(),
    };
  }
}
