import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function getShoppingMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (
    variant === null ||
    variant.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Product variant not found or does not belong to the specified product",
      404,
    );
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null || product.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized access to product", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUnique({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
      },
    });
  if (
    snapshot === null ||
    snapshot.shopping_mall_product_variant_id !== props.variantId
  ) {
    throw new HttpException(
      "Snapshot not found for the specified variant",
      404,
    );
  }
  const transformed =
    await ShoppingMallProductVariantSnapshotTransformer.transform({
      ...snapshot,
      productVariant: { id: variant.id },
    });
  return transformed;
}
