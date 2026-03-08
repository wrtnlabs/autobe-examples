import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCartItemCollector {
  export async function collect(props: {
    body: IEcommerceMallCartItem.ICreate;
    ecommerceMallShoppingCarts: IEntity;
  }) {
    // Fetch variant to get price at time of addition
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
        where: { id: props.body.variant_id },
      });
    // Validate variant is active and has stock
    if (!variant.is_active) {
      throw new Error("Variant is not active");
    }
    if (variant.stock_quantity === 0) {
      throw new Error("Variant is out of stock");
    }
    const id: string = v4();
    return {
      id,
      quantity: props.body.quantity,
      price: variant.price_override ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: {
        connect: { id: props.ecommerceMallShoppingCarts.id },
      },
      variant: {
        connect: { id: props.body.variant_id },
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}
