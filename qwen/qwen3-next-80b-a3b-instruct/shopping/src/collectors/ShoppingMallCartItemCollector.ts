import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartItemCollector {
  export async function collect(props: {
    body: IShoppingMallCartItem.ICreate;
    shoppingMallProductVariant: IEntity;
    shoppingMallCustomer: IEntity;
  }) {
    const id: string = v4();
    // Query the variant to extract snapshot information
    const variantRecord =
      await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: props.shoppingMallProductVariant.id },
        include: {
          product: {
            include: {
              seller: true,
            },
          },
        },
      });
    return {
      id,
      customer_id: props.shoppingMallCustomer.id,
      quantity: 1, // Default to 1 since ICreate is empty and column is not nullable
      snapshot_product_name: variantRecord.product.name,
      snapshot_product_description: variantRecord.product.description,
      snapshot_variant_options: variantRecord.option_values,
      snapshot_variant_price:
        variantRecord.price_override ?? variantRecord.product.base_price,
      snapshot_seller_shop_name: variantRecord.product.seller.name,
      snapshot_seller_logo: variantRecord.product.seller.logo_url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      variant: { connect: { id: props.shoppingMallProductVariant.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
  }
}
