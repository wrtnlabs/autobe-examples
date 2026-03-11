import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallWishlistCollector {
  export async function collect(props: {
    body: IEcommerceMallWishlist.ICreate;
    ecommerceMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.ecommerce_mall_wishlistsCreateInput;
  }
}
