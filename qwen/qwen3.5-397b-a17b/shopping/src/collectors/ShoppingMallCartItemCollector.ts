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
    return {
      id,
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      cart: { connect: { id: props.shoppingMallCarts.id } },
      productVariant: { connect: { id: props.body.product_variant_id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
