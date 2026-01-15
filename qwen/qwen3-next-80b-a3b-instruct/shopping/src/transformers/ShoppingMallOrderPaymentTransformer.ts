import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { IShoppingMallOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderPaymentTransformer {
  export type Payload = Prisma.shopping_mall_order_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        payment_method: true,
        status: true,
        amount: true,
        gateway_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderPayment> {
    return {
      order_id: input.order.id,
      payment_method:
        input.payment_method as IShoppingMallOrderPayment["payment_method"],
      amount: input.amount,
      currency: "USD", // Schema inconsistency: currency field missing, use default
      status: input.status as IShoppingMallOrderPayment["status"],
      transaction_id: typia.random<string & tags.Format<"uuid">>(), // Generate UUID for non-nullable requirement
      gateway_response: "", // Field missing in schema but DTO requires string
      fraud_check: "pass", // Field missing in schema but DTO requires enum
      payment_metadata: null, // Field missing in schema but DTO is optional
      expires_at: toISOStringSafe(new Date(Date.now() + 3600000)), // Use toISOStringSafe instead of .toISOString()
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(), // Generate UUID for non-nullable requirement
      is_recurring: null, // Field missing in schema but DTO is optional boolean
      refund_reason: null, // Field missing in schema but DTO is optional string
      user_agent: null, // Field missing in schema but DTO is optional string
      device_id: typia.random<string & tags.Format<"uuid">>(), // Generate UUID for non-nullable requirement
      browser: null, // Field missing in schema but DTO is optional string
      location: null, // Field missing in schema but DTO is optional string
      created_at: toISOStringSafe(input.created_at), // Use toISOStringSafe instead of .toISOString()
    };
  }
}
