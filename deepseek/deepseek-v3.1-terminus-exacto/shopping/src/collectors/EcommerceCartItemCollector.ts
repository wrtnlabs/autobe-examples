import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCartItemCollector {
  export async function collect(props: {
    body: IEcommerceCartItem.ICreate;
    shoppingCartId: string;
    productId: string;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      quantity: props.body.quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // Required relationships
      shoppingCart: { connect: { id: props.shoppingCartId } },
      productVariant: { connect: { id: props.body.product_variant_id } },
      product: { connect: { id: props.productId } },
    } satisfies Prisma.ecommerce_cart_itemsCreateInput;
  }
}
