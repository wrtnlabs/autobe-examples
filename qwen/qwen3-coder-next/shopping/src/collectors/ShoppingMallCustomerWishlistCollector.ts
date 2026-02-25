import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerWishlistCollector {
  export async function collect(props: {
    body: IShoppingMallCustomerWishlist.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      added_at: new Date(),
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: props.body.shopping_mall_product_id } },
    } satisfies Prisma.shopping_mall_customer_wishlistsCreateInput;
  }
}
