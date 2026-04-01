import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotVariantTransformer } from "../transformers/ShoppingMallProductSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariantsVariantSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  variantSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotVariant> {
  const variantSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.findUniqueOrThrow(
      {
        where: { id: props.variantSnapshotId },
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          created_at: true,
          shopping_mall_product_snapshot_id: true,
        },
      } satisfies Prisma.shopping_mall_product_snapshot_variantsFindUniqueOrThrowArgs,
    );
  if (variantSnapshot.shopping_mall_product_snapshot_id !== props.snapshotId) {
    throw new HttpException("Snapshot ID mismatch", 404);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindUniqueOrThrowArgs);
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Product ID mismatch", 404);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
      },
    } satisfies Prisma.shopping_mall_productsFindUniqueOrThrowArgs);
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductSnapshotVariantTransformer.transform(
    variantSnapshot,
  );
}
