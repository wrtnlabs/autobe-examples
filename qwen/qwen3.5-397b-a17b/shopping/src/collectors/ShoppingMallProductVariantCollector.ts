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
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      sku_code: props.body.sku_code,
      option_values: props.body.option_values,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      product: { connect: { id: props.shoppingMallProducts.id } },
      // HasMany relations (reverse - not created here)
      productVariantSnapshots: undefined,
      inventoryRecords: undefined,
      cartItems: undefined,
      orderItems: undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
