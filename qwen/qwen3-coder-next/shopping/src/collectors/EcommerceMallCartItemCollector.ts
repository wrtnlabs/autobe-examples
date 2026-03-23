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
    customer: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      variant: { connect: { id: props.body.variant_id } },
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}
