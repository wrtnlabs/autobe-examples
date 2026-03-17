import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductSnapshotImageTransformer } from "./EcommerceMallProductSnapshotImageTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_id: true,
        category_id: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        images: EcommerceMallProductSnapshotImageTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      productId: input.product_id,
      categoryId: input.category_id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      createdAt: toISOStringSafe(input.created_at),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductSnapshotImageTransformer.transform,
      ),
    };
  }
}
