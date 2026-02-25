import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShoppingCartItemCollector {
  export async function collect(props: {
    body: IShoppingMallShoppingCartItem.ICreate;
    customer: IEntity;
    variant: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      added_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      variant: { connect: { id: props.variant.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
