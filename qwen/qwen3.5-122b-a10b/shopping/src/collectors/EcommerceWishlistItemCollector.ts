import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceWishlistItemCollector {
  export async function collect(props: {
    body: IEcommerceWishlistItem.ICreate;
    ecommerceWishlists: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ecommerceWishlist: { connect: { id: props.ecommerceWishlists.id } },
      ecommerceProduct: { connect: { id: props.body.ecommerce_product_id } },
    } satisfies Prisma.ecommerce_wishlist_itemsCreateInput;
  }
}
