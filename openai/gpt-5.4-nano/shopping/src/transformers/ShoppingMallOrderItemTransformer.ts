import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";
import { ShoppingMallSnapshotAtSummaryTransformer } from "./ShoppingMallSnapshotAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        seller_snapshot_id: true,
        shopping_mall_shipment_id: true,
        seller_price_at_purchase: true,
        quantity: true,
        line_item_status: true,
        placed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        sellerSnapshot: ShoppingMallSnapshotAtSummaryTransformer.select(),
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
        review: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      sellerSnapshot: await ShoppingMallSnapshotAtSummaryTransformer.transform(
        input.sellerSnapshot,
      ),
      shipment: input.shipment
        ? await ShoppingMallShipmentAtSummaryTransformer.transform(
            input.shipment,
          )
        : null,
      shoppingMallOrderId: input.shopping_mall_order_id,
      shoppingMallProductVariantId: input.shopping_mall_product_variant_id,
      sellerSnapshotId: input.seller_snapshot_id,
      shoppingMallShipmentId: input.shopping_mall_shipment_id ?? null,
      sellerPriceAtPurchase: input.seller_price_at_purchase,
      quantity: input.quantity,
      lineItemStatus: input.line_item_status,
      placedAt: input.placed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
