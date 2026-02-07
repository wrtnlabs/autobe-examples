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
    ecommerceCustomers: IEntity;
  }) {
    const id = v4();
    const productVariant =
      await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
        where: { id: props.body.productVariantId },
        select: { price: true },
      });
    return {
      id,
      price: productVariant.price ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceCustomers.id } },
      productVariant: { connect: { id: props.body.productVariantId } },
    } satisfies Prisma.ecommerce_wishlist_itemsCreateInput;
  }
}
