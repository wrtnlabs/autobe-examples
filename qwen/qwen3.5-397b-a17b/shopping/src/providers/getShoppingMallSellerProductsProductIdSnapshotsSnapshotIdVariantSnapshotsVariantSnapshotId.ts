import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
  const variantSnapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.variantSnapshotId },
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    );
  if (variantSnapshot.productSnapshot.id !== props.snapshotId) {
    throw new HttpException(
      "Variant snapshot does not belong to the specified product snapshot",
      404,
    );
  }
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (productSnapshot.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - You do not own this product", 403);
  }
  if (productSnapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Product snapshot does not belong to the specified product",
      404,
    );
  }
  return await ShoppingMallProductVariantSnapshotTransformer.transform(
    variantSnapshot,
  );
}
