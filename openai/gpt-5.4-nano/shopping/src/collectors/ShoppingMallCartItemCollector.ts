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
    cart: IEntity;
  }) {
    const id = v4();
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.shoppingMallProductVariantId },
        select: { id: true, price: true },
      });
    return {
      id,
      quantity: props.body.quantity,
      subtotal_amount: variant.price * props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: { connect: { id: props.cart.id } },
      productVariant: { connect: { id: variant.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
