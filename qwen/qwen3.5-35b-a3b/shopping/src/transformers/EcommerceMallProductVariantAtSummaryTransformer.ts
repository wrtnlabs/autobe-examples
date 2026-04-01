import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        options: true,
        base_price: true,
        sale_price: true,
        stock_quantity: true,
        reserved_quantity: true,
        status: true,
        sort_order: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        variantSnapshots: true,
        variantOptions: true,
        inventoryRecords: true,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant.ISummary> {
    return {
      id: input.id,
      sku: input.sku,
      options: JSON.parse(input.options),
      basePrice: Number(input.base_price),
      salePrice: input.sale_price != null ? Number(input.sale_price) : null,
      stockQuantity: input.stock_quantity,
      reservedQuantity: input.reserved_quantity,
      status: input.status,
      sortOrder: input.sort_order,
      isDefault: input.is_default,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallProductVariant.ISummary;
  }
}
