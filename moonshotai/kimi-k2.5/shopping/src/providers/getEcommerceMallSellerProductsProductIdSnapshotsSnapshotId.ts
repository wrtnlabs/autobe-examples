import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductSnapshotImageTransformer } from "../transformers/EcommerceMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
      },
    });
  if (snapshot.product_id !== props.productId) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Fetch product separately for seller permission check
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: snapshot.product_id },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch category and images separately
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: snapshot.category_id },
      ...EcommerceMallCategoryAtSummaryTransformer.select(),
    });
  const images =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: { ecommerce_mall_product_snapshot_id: snapshot.id },
      ...EcommerceMallProductSnapshotImageTransformer.select(),
    });
  const productFull =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: snapshot.product_id },
      ...EcommerceMallProductAtSummaryTransformer.select(),
    });
  return {
    id: snapshot.id,
    productId: snapshot.product_id,
    categoryId: snapshot.category_id,
    name: snapshot.name,
    description: snapshot.description,
    basePrice: snapshot.base_price,
    createdAt: toISOStringSafe(snapshot.created_at),
    category:
      await EcommerceMallCategoryAtSummaryTransformer.transform(category),
    product:
      await EcommerceMallProductAtSummaryTransformer.transform(productFull),
    images: await ArrayUtil.asyncMap(
      images,
      EcommerceMallProductSnapshotImageTransformer.transform,
    ),
  } satisfies IEcommerceMallProductSnapshot;
}
