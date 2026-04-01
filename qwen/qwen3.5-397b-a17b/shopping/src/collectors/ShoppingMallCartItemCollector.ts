import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartItemCollector {
  export async function collect(props: {
    body: IShoppingMallCartItem.ICreate;
    shoppingMallCarts: IEntity;
  }) {
    const id: string = v4();
    // Query product variant to get price snapshot at time of adding to cart
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.shopping_mall_product_variant_id },
        select: { price_override: true },
      });
    return {
      // Scalar fields
      id,
      quantity: props.body.quantity,
      price: variant.price_override ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      cart: { connect: { id: props.shoppingMallCarts.id } },
      productVariant: {
        connect: { id: props.body.shopping_mall_product_variant_id },
      },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
