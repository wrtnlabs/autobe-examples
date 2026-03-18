import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItem.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      seller_price_at_purchase: props.body.seller_price_at_purchase,
      quantity: props.body.quantity,
      line_item_status: props.body.line_item_status,
      placed_at: new Date(props.body.placed_at),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      order: {
        connect: { id: props.body.shopping_mall_order_id },
      },
      productVariant: {
        connect: { id: props.body.shopping_mall_product_variant_id },
      },
      sellerSnapshot: {
        connect: { id: props.body.seller_snapshot_id },
      },
      shipment:
        props.body.shopping_mall_shipment_id != null
          ? { connect: { id: props.body.shopping_mall_shipment_id } }
          : undefined,
      cancellationRequests: undefined,
      refundRequests: undefined,
      review: undefined,
    } satisfies Prisma.shopping_mall_order_itemsCreateInput;
  }
}
