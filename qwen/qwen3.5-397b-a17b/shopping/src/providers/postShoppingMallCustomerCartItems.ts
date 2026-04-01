import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // 1. Get or create customer's active cart
  let cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // 2. Verify product variant exists and is active
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.body.shopping_mall_product_variant_id,
      deleted_at: null,
    },
  });
  // 3. Check if cart item already exists
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        shopping_mall_cart_id: cart.id,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
        deleted_at: null,
      },
    },
  );
  let cartItem: ShoppingMallCartItemTransformer.Payload;
  if (existingItem) {
    // 4a. Update existing item quantity
    const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: new Date(),
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
    cartItem = updated;
  } else {
    // 4b. Create new cart item using collector
    const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: await ShoppingMallCartItemCollector.collect({
        body: props.body,
        shoppingMallCarts: cart,
      }),
      ...ShoppingMallCartItemTransformer.select(),
    });
    cartItem = created;
  }
  // 5. Transform and return
  return await ShoppingMallCartItemTransformer.transform(cartItem);
}
