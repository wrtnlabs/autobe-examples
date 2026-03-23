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
    ecommerceMallCustomers: IEntity;
    ecommerceMallProducts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: props.ecommerceMallProducts.id } },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsCreateInput;
  }
}
