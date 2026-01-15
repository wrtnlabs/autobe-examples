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
    cart: IEntity; // from path parameter cartId
    productVariant: IEntity; // from product_variant_id in DTO (indirect reference)
  }) {
    // Query product variant to get price (indirect reference)
    const productVariantRecord =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.product_variant_id },
      });
    return {
      id: v4(),
      quantity: props.body.quantity,
      price: productVariantRecord.price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: {
        connect: { id: props.cart.id },
      },
      productVariant: {
        connect: { id: props.productVariant.id },
      },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
