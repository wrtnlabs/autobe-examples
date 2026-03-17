import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductVariantOptionCollector } from "./ShoppingMallProductVariantOptionCollector";

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
      price: props.body.price ?? null,
      stock_quantity: props.body.stock_quantity,
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      product: { connect: { id: props.shoppingMallProducts.id } },
      // HasMany relations
      options: {
        create: await ArrayUtil.asyncMap(props.body.options, (option) =>
          ShoppingMallProductVariantOptionCollector.collect({
            body: option,
            shoppingMallProductVariants: { id },
          }),
        ),
      },
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
