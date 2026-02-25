import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    shoppingMallProducts: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.shoppingMallProducts.id },
      },
      options: props.body.optionValues.length
        ? {
            create: props.body.optionValues.map((option) => ({
              id: v4(),
              key: option.key,
              value: option.value,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          }
        : undefined,
      inventoryHistories:
        props.body.stockQuantity && props.body.stockQuantity > 0
          ? {
              create: [
                {
                  id: v4(),
                  quantity_change: props.body.stockQuantity,
                  reason: "Initial stock",
                  created_at: new Date(),
                },
              ],
            }
          : undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
