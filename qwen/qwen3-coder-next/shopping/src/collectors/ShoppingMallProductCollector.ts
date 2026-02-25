import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductVariantCollector } from "./ShoppingMallProductVariantCollector";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallCategories: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      is_deleted: false,
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.shoppingMallSellers.id } },
      category: { connect: { id: props.body.shopping_mall_category_id } },
      // HasMany relations
      variants: props.body.variants.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.variants, (variant) =>
              ShoppingMallProductVariantCollector.collect({
                body: variant,
                product: { id },
              }),
            ),
          }
        : undefined,
      // Product images require productId - handled in separate step
      productImages: undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
