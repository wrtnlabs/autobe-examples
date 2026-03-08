import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemRefundRequestAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_refund_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        requested_at: true,
        responded_at: true,
        days_since_delivery: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            order: {
              select: {
                order_number: true,
              },
            } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
            productVariant: {
              select: {
                product: {
                  select: {
                    name: true,
                    seller: {
                      select: {
                        shop_name: true,
                      },
                    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
                  },
                } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_item_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      requested_at: input.requested_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      days_since_delivery: input.days_since_delivery,
      order_number: input.orderItem.order.order_number,
      product_name: input.orderItem.productVariant.product.name,
      seller_shop_name: input.orderItem.productVariant.product.seller.shop_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
