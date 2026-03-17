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
      sku: props.body.sku,
      price_override: props.body.priceOverride ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.shoppingMallProducts.id },
      },
      options: {
        create: props.body.options.map((option) => ({
          id: option.id,
          key: option.key,
          value: option.value,
          sequence: option.sequence,
          created_at: new Date(option.created_at),
        })),
      },
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
