import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceProductVariantTransformer {
  export type Payload = Prisma.ecommerce_product_variantsGetPayload<
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
        product: EcommerceProductAtSummaryTransformer.select(),
        cartItems: {
          select: {},
        } satisfies Prisma.ecommerce_cart_itemsFindManyArgs,
        inventoryRecords: {
          select: { quantity_change: true },
        } satisfies Prisma.ecommerce_inventory_recordsFindManyArgs,
        orderItems: {
          select: {},
        } satisfies Prisma.ecommerce_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductVariant> {
    const stockQuantity = input.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return {
      id: input.id,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price,
      stock_quantity: stockQuantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceProductVariant;
  }
}
