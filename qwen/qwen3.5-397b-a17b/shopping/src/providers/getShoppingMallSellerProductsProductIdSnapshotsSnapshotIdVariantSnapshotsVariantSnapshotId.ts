import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariantSnapshotsVariantSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  variantSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
      {
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
        where: {
          id: props.variantSnapshotId,
          shopping_mall_product_snapshot_id: props.snapshotId,
          productSnapshot: {
            shopping_mall_product_id: props.productId,
            product: {
              shopping_mall_seller_id: props.seller.id,
            },
          },
        },
      },
    );
  return await ShoppingMallProductVariantSnapshotTransformer.transform(record);
}
