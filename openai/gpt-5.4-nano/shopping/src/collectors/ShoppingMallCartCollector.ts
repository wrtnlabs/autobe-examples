import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartCollector {
  export async function collect(props: {
    body: IShoppingMallCart.ICreate;
    shoppingMallMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      warning_inventory_insufficient: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.shoppingMallMembers.id } },
      cartItems: undefined,
    } satisfies Prisma.shopping_mall_cartsCreateInput;
  }
}
