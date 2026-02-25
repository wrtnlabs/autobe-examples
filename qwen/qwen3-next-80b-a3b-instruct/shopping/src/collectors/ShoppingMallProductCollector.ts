import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
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
      seller: { connect: { id: props.shoppingMallSellers.id } },
      category: { connect: { id: props.body.category_id } },
      productSnapshots: undefined,
      images:
        props.body.images && props.body.images.length > 0
          ? {
              create: props.body.images.map((url, i) => ({
                image_url: url,
                position: i,
                created_at: new Date(),
                id: v4(),
              })),
            }
          : undefined,
      variants:
        props.body.variants && props.body.variants.length > 0
          ? {
              create: await ArrayUtil.asyncMap(props.body.variants, (variant) =>
                ShoppingMallProductVariantCollector.collect({
                  body: variant,
                  shoppingMallProducts: { id },
                }),
              ),
            }
          : undefined,
      orderItems: undefined,
      orderItemProductSnapshots: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
