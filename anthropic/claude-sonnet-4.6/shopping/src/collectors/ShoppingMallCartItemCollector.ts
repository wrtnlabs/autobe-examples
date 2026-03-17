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
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      availability_status: "available",
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      productVariant: { connect: { id: props.body.product_variant_id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
