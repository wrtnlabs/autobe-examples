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
    member: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      warning_inventory_insufficient: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      // cartItems is a hasMany reverse relation; this DTO initializes only the cart container.
    } satisfies Prisma.shopping_mall_cartsCreateInput;
  }
}
