import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItem.ICreate;
    shoppingMallOrders: IEntity;
  }) {
    // First, get variant information
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.productVariantId },
      });
    // Get product information
    const product =
      await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
        where: { id: variant.product_id },
      });
    // Calculate total amount using price from IShoppingMallOrderItem.ICreate
    const totalPrice = props.body.price * props.body.quantity;
    return {
      // Primary key
      id: v4(),
      // Direct field mappings
      quantity: props.body.quantity,
      price: props.body.price,
      total_amount: totalPrice,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relationships
      order: {
        connect: { id: props.shoppingMallOrders.id },
      },
      variant: {
        connect: { id: props.body.productVariantId },
      },
      seller: {
        connect: { id: product.seller_id },
      },
    } satisfies Prisma.shopping_mall_order_itemsCreateInput;
  }
}
