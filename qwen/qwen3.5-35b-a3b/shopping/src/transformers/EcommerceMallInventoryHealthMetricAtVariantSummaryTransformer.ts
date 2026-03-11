import { IEcommerceMallInventoryHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventoryHealthMetricAtVariantSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<{
    select: {
      id: true;
      sku_code: true;
      stock_quantity: true;
      product: {
        select: {
          name: true;
          seller_id: true;
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        stock_quantity: true,
        product: {
          select: {
            name: true,
            seller_id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryHealthMetric.IVariantSummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      stockQuantity: Number(input.stock_quantity),
      productName: input.product.name,
      sellerId: input.product.seller_id,
    };
  }
}
