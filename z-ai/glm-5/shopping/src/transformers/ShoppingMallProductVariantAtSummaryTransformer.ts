import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtOptionTransformer } from "./ShoppingMallProductVariantAtOptionTransformer";

export namespace ShoppingMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        options: ShoppingMallProductVariantAtOptionTransformer.select(),
        inventoryHistories: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant.ISummary> {
    const stock_quantity: number = input.inventoryHistories.reduce(
      (sum, history) => sum + history.quantity_change,
      0,
    );
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallProductVariantAtOptionTransformer.transform,
      ),
      stock_quantity: stock_quantity,
      in_stock: stock_quantity > 0,
    };
  }
}
