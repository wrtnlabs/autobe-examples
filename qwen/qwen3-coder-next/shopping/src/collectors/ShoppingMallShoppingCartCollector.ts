import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShoppingCartCollector {
  export async function collect(props: {
    body: IShoppingMallShoppingCart.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      variant: { connect: { id: props.body.shopping_mall_product_variant_id } },
    } satisfies Prisma.shopping_mall_shopping_cartsCreateInput;
  }
}
