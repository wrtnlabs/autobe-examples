import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductImageCollector } from "./ShoppingMallProductImageCollector";
import { ShoppingMallProductVariantCollector } from "./ShoppingMallProductVariantCollector";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo: seller (required)
      seller: { connect: { id: props.shoppingMallSellers.id } },
      // BelongsTo: category (nullable FK but DTO always provides categoryId)
      category: { connect: { id: props.body.categoryId } },
      // HasMany: images (nested create via neighbor collector)
      images:
        props.body.images && props.body.images.length > 0
          ? {
              create: (
                await ArrayUtil.asyncMap(props.body.images, (imageCreate) =>
                  ShoppingMallProductImageCollector.collect({
                    body: imageCreate,
                    shoppingMallProducts: { id },
                    shoppingMallSellers: props.shoppingMallSellers,
                    shoppingMallSellerSessions:
                      props.shoppingMallSellerSessions,
                  }),
                )
              ).flat(),
            }
          : undefined,
      // HasMany: variants (nested create via neighbor collector)
      variants:
        props.body.variants && props.body.variants.length > 0
          ? {
              create: (
                await ArrayUtil.asyncMap(props.body.variants, (variantCreate) =>
                  ShoppingMallProductVariantCollector.collect({
                    body: variantCreate,
                    shoppingMallProducts: { id },
                    shoppingMallSellers: props.shoppingMallSellers,
                    shoppingMallSellerSessions:
                      props.shoppingMallSellerSessions,
                  }),
                )
              ).flat(),
            }
          : undefined,
      // snapshots, wishlistItems, reviews: not applicable for creation
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
