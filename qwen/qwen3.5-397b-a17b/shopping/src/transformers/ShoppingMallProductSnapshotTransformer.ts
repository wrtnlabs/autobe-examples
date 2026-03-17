import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductSnapshotImageTransformer } from "./ShoppingMallProductSnapshotImageTransformer";
import { ShoppingMallProductVariantSnapshotTransformer } from "./ShoppingMallProductVariantSnapshotTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        snapshot_at: true,
        created_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        snapshotBy: ShoppingMallSellerAtSummaryTransformer.select(),
        images: ShoppingMallProductSnapshotImageTransformer.select(),
        variantSnapshots:
          ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      base_price: input.base_price,
      snapshot_at: input.snapshot_at.toISOString(),
      created_at: input.created_at.toISOString(),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.snapshotBy,
      ),
      variantSnapshots: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        ShoppingMallProductVariantSnapshotTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductSnapshotImageTransformer.transform,
      ),
    };
  }
}
