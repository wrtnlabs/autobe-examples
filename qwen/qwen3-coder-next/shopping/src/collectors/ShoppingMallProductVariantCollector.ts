import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductVariantOptionValueCollector } from "./ShoppingMallProductVariantOptionValueCollector";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.sku_code,
      price_override: props.body.price_override ?? null,
      stock_quantity: props.body.stock_quantity ?? 0,
      product: {
        connect: {
          id: props.product.id,
        },
      },
      optionValues: props.body.option_values.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.option_values,
              (optionValue) =>
                ShoppingMallProductVariantOptionValueCollector.collect({
                  body: optionValue,
                  variant: { id },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
