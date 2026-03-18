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
    productVariantPrice: number;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      quantity: props.body.quantity,
      subtotal_amount: props.productVariantPrice * props.body.quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      cart: { connect: { id: props.cart.id } },
      productVariant: {
        connect: { id: props.body.shoppingMallProductVariantId },
      },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
