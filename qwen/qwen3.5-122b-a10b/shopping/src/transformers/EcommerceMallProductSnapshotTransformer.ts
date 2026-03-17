import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      productId: input.ecommerce_mall_products_id,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      sellerId: input.ecommerce_mall_sellers_id ?? undefined,
      seller: input.seller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(input.seller)
        : undefined,
      previousValues: JSON.parse(input.previous_values),
      currentValues: JSON.parse(input.current_values),
      createdAt: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        ecommerce_mall_products_id: true,
        ecommerce_mall_sellers_id: true,
        previous_values: true,
        current_values: true,
        created_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
}
