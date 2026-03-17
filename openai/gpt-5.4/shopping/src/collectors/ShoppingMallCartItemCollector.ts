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
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: {
          id: props.body.shopping_mall_product_variant_id,
        },
      });
    if (
      variant.shopping_mall_product_id !== props.body.shopping_mall_product_id
    )
      throw new Error("Invalid product variant for the specified product.");
    const now = new Date();
    return {
      id: v4(),
      quantity: props.body.quantity,
      unit_price: variant.price ?? 0,
      availability: variant.deleted_at === null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
      product: {
        connect: {
          id: variant.shopping_mall_product_id,
        },
      },
      productVariant: {
        connect: {
          id: variant.id,
        },
      },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
