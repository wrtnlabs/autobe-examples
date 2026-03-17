import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    seller: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: {
          id: props.seller.id,
        },
      },
      category: props.body.shopping_mall_category_id
        ? {
            connect: {
              id: props.body.shopping_mall_category_id,
            },
          }
        : undefined,
      images: undefined,
      variants: undefined,
      snapshots: undefined,
      wishlistEntries: undefined,
      cartItems: undefined,
      purchaseSnapshots: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
