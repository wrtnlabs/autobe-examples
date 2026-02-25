import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartCollector {
  export async function collect(props: {
    body: IShoppingMallCart.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    // Get variant to resolve relationships
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.variant_id },
      });
    // Get product from variant to resolve product snapshot
    const product =
      await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
        where: { id: variant.product_id },
      });
    // Get latest product snapshot
    const productSnapshot =
      await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
        where: { product_id: product.id },
        orderBy: { created_at: "desc" },
      });
    // Get latest variant snapshot
    const variantSnapshot =
      await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
        {
          where: { variant: { id: variant.id } },
          orderBy: { created_at: "desc" },
        },
      );
    // Get seller from product
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow(
      {
        where: { id: product.seller_id },
      },
    );
    const id: string = v4();
    const unit_price: number = variant.price || 0; // fallback to 0 if null
    const item_total: number = props.body.quantity * unit_price;
    return {
      id,
      quantity: props.body.quantity,
      unit_price,
      item_total,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      variant: { connect: { id: props.body.variant_id } },
      productSnapshot: { connect: { id: productSnapshot.id } },
      variantSnapshot: { connect: { id: variantSnapshot.id } },
      seller: { connect: { id: seller.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
