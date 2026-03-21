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
    ecommerceMallCarts: IEntity;
    ecommerceMallCustomerSessions: IEntity;
  }) {
    const now = new Date();
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: now,
      updated_at: now,
      cart: { connect: { id: props.ecommerceMallCarts.id } },
      productVariant: { connect: { id: props.body.variant_id } },
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}
