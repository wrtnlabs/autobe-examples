import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentNotificationAtSummaryTransformer {
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
  ): Promise<IShoppingMallPaymentNotification.ISummary> {
    return {
      id: input.id,
      type: input.notification_type,
      status: input.status,
      notification_sent_at: input.sent_at.toISOString(),
      recipient_type: input.recipient_type,
      created_at: input.created_at.toISOString(),
      attempts: 0, // No database field exists. DTO requires number.
      error_code: null, // No database field exists. DTO allows null.
      message_summary: "", // No database field exists. DTO requires string.
    };
  }
}
