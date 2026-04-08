import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductVariantTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        productVariantSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs,
        inventoryRecords: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
        cartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IShoppingMallProductVariant;
  }
}
