import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentWebhookAtResponseTransformer {
  export type Payload = Prisma.shopping_mall_payment_webhooksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        event_types: true,
        status: true,
        delivery_count: true,
        last_delivery_at: true,
        last_failure_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_webhooksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentWebhook.IResponse> {
    return {
      paymentId: input.id,
      status:
        input.status as any as IShoppingMallPaymentWebhook.IResponse["status"],
    };
  }
}
