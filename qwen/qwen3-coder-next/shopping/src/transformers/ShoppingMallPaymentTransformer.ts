import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentTransformer {
  export type Payload = Prisma.shopping_mall_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_order_id: true,
        customer_id: true,
        seller_id: true,
        payment_gateway_transaction_id: true,
        amount: true,
        currency: true,
        payment_method_type: true,
        payment_method_token: true,
        status: true,
        gateway_response_code: true,
        gateway_response_message: true,
        customer_ip: true,
        payment_gateway_response_data: true,
        order: true,
        customer: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPayment> {
    return {
      id: input.id,
      shopping_mall_order_id: input.shopping_mall_order_id,
      customer_id: input.customer_id,
      seller_id: input.seller_id,
      payment_gateway_transaction_id:
        input.payment_gateway_transaction_id ?? undefined,
      amount: input.amount,
      currency: input.currency,
      payment_method_type: input.payment_method_type,
      payment_method_token: input.payment_method_token,
      status: input.status,
      gateway_response_code: input.gateway_response_code ?? undefined,
      gateway_response_message: input.gateway_response_message ?? undefined,
      customer_ip: input.customer_ip ?? undefined,
      payment_gateway_response_data:
        input.payment_gateway_response_data ?? undefined,
    };
  }
}
