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
    ecommerceCarts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: { connect: { id: props.ecommerceCarts.id } },
      productVariant: {
        connect: { id: props.body.ecommerce_product_variant_id },
      },
    } satisfies Prisma.ecommerce_cart_itemsCreateInput;
  }
}
