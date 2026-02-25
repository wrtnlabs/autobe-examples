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
    customer: IEntity;
  }) {
    const id: string = v4();
    // Query variant to get unit_price (indirect reference pattern)
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.variantId },
      });
    return {
      id,
      quantity: props.body.quantity,
      unit_price: variant.price ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      variant: { connect: { id: variant.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
