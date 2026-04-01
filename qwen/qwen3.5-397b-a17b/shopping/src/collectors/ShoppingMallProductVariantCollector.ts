import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      sku_code: props.body.sku_code,
      price_override: props.body.price_override ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      product: { connect: { id: props.shoppingMallProducts.id } },
      // HasMany relations - variantOptions junction
      variantOptions: {
        create: props.body.option_value_ids.map((optionValueId) => ({
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          optionValue: { connect: { id: optionValueId } },
          option_value: { connect: { id: optionValueId } },
        })),
      },
      // Other hasMany relations not needed at creation time
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
