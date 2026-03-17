import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      submittedAt: toISOStringSafe(input.requested_at),
      respondedAt: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      hasResponse: input.responded_at !== null,
      orderItemId: input.orderItem.id,
      productName: "",
      sellerShopName: input.seller.email,
      customerDisplayName: input.customer.email,
    };
  }
}
