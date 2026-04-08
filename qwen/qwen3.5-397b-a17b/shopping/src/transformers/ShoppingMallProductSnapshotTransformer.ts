import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductSnapshotImageTransformer } from "./ShoppingMallProductSnapshotImageTransformer";
import { ShoppingMallProductVariantSnapshotAtSummaryTransformer } from "./ShoppingMallProductVariantSnapshotAtSummaryTransformer";

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
        created_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        productVariantSnapshots:
          ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
        images: ShoppingMallProductSnapshotImageTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      created_at: input.created_at.toISOString(),
      productVariantSnapshots: await ArrayUtil.asyncMap(
        input.productVariantSnapshots,
        ShoppingMallProductVariantSnapshotAtSummaryTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductSnapshotImageTransformer.transform,
      ),
    } satisfies IShoppingMallProductSnapshot;
  }
}
