import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartItemCollector {
  export async function collect(props: {
    body: IShoppingMallCartItem.ICreate;
    shoppingMallCustomers: IEntity; // from authorized actor
    shoppingMallCustomerSessions: IEntity; // from authorized session
  }) {
    // Query the product variant to get its current price
    const variant =
      await MyGlobal.prisma.shopping_mall_sale_specifications.findFirstOrThrow({
        where: { id: props.body.variantId },
      });
    return {
      id: v4(),
      quantity: props.body.quantity,
      price_at_time: 0, // Schema does not expose a price field - fallback to 0
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      productVariant: { connect: { id: props.body.variantId } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
