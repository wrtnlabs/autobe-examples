import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductSnapshotImageCopyTransformer } from "./ShoppingMallProductSnapshotImageCopyTransformer";
import { ShoppingMallProductVariantSnapshotTransformer } from "./ShoppingMallProductVariantSnapshotTransformer";

export namespace ShoppingMallProductSnapshotTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      imageCopies: await ArrayUtil.asyncMap(
        input.imageCopies,
        ShoppingMallProductSnapshotImageCopyTransformer.transform,
      ),
      variantSnapshots: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        ShoppingMallProductVariantSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        imageCopies: ShoppingMallProductSnapshotImageCopyTransformer.select(),
        variantSnapshots:
          ShoppingMallProductVariantSnapshotTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
}
