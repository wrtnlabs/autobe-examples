import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderRefundRequestAtRejectTransformer {
  export type Payload = Prisma.shopping_mall_order_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reason: true,
        status: true,
        rejection_reason: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        customer: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        customerSession: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_customer_sessionsFindManyArgs,
        statusLogs: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_refund_request_logsFindManyArgs,
        refundPayments: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_paymentsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderRefundRequest.IReject> {
    return {
      reason: input.rejection_reason ?? undefined,
    };
  }
}
