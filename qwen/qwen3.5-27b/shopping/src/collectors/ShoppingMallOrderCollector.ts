import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    // Use empty JSON object for shipping address snapshot since shopping_mall_addresses table doesn't exist
    const shippingAddressSnapshot = JSON.stringify({});
    // Query cart items for this customer
    const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_customer_id: props.shoppingMallCustomers.id,
        deleted_at: null,
      },
    });
    // Calculate total price (placeholder - actual price logic depends on product/variant tables)
    const totalPrice = 0;
    // Create order items inline with all required fields
    const orderItems = await ArrayUtil.asyncMap(
      cartItems,
      async (cartItem, index) => ({
        id: v4(),
        quantity: cartItem.quantity,
        price: 0, // Placeholder - need product/variant price
        status: "paid",
        product_snapshot: JSON.stringify({}),
        variant_snapshot: JSON.stringify({}),
        seller_profile_snapshot: JSON.stringify({}),
        seller: { connect: { id: "00000000-0000-0000-0000-000000000000" } }, // Placeholder seller
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }),
    );
    return {
      id,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      shipping_address_snapshot: shippingAddressSnapshot,
      total_price: totalPrice,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItems: cartItems.length > 0 ? { create: orderItems } : undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
