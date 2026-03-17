import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallWishlistItemCollector {
  export async function collect(props: {
    body: IEcommerceMallWishlistItem.ICreate;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsCreateInput;
  }
}
