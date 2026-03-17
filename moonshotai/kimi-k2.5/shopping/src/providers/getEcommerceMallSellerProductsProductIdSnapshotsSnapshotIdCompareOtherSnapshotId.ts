import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IFieldComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IFieldComparison";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  otherSnapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot.IComparison> {
  // Verify product exists
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  // Verify seller owns the product (authorization check)
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch both snapshots with images
  const [firstSnapshot, secondSnapshot] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        images: {
          select: {
            id: true,
            url: true,
            display_order: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.otherSnapshotId },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        images: {
          select: {
            id: true,
            url: true,
            display_order: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
      },
    }),
  ]);
  // Verify both snapshots belong to the specified product
  if (
    firstSnapshot.product_id !== props.productId ||
    secondSnapshot.product_id !== props.productId
  ) {
    throw new HttpException("Snapshot not found for this product", 404);
  }
  // Determine chronological order (before = older, after = newer)
  const isFirstOlder = firstSnapshot.created_at <= secondSnapshot.created_at;
  const beforeSnapshot = isFirstOlder ? firstSnapshot : secondSnapshot;
  const afterSnapshot = isFirstOlder ? secondSnapshot : firstSnapshot;
  // Build field comparisons
  const buildFieldComparison = (
    before: string,
    after: string,
  ): IFieldComparison => ({
    before,
    after,
    changed: before !== after,
  });
  const nameComparison = buildFieldComparison(
    beforeSnapshot.name,
    afterSnapshot.name,
  );
  const descriptionComparison = buildFieldComparison(
    beforeSnapshot.description,
    afterSnapshot.description,
  );
  const basePriceComparison = buildFieldComparison(
    String(beforeSnapshot.base_price),
    String(afterSnapshot.base_price),
  );
  const categoryIdComparison = buildFieldComparison(
    beforeSnapshot.category_id,
    afterSnapshot.category_id,
  );
  // Compare images - create maps by URL for comparison
  const beforeImagesByUrl = new Map(
    beforeSnapshot.images.map((img) => [img.url, img]),
  );
  const afterImagesByUrl = new Map(
    afterSnapshot.images.map((img) => [img.url, img]),
  );
  const addedImages: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const removedImages: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const unchangedImages: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const reorderedImages: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  // Find added and unchanged/reordered images
  for (const afterImg of afterSnapshot.images) {
    const beforeImg = beforeImagesByUrl.get(afterImg.url);
    if (!beforeImg) {
      addedImages.push({
        id: typia.random<string & tags.Format<"uuid">>(),
        imageUrl: afterImg.url as string & tags.Format<"uri">,
        displayOrder: afterImg.display_order,
      });
    } else if (beforeImg.display_order !== afterImg.display_order) {
      reorderedImages.push({
        id: typia.random<string & tags.Format<"uuid">>(),
        imageUrl: afterImg.url as string & tags.Format<"uri">,
        displayOrder: afterImg.display_order,
      });
    } else {
      unchangedImages.push({
        id: typia.random<string & tags.Format<"uuid">>(),
        imageUrl: afterImg.url as string & tags.Format<"uri">,
        displayOrder: afterImg.display_order,
      });
    }
  }
  // Find removed images
  for (const beforeImg of beforeSnapshot.images) {
    if (!afterImagesByUrl.has(beforeImg.url)) {
      removedImages.push({
        id: typia.random<string & tags.Format<"uuid">>(),
        imageUrl: beforeImg.url as string & tags.Format<"uri">,
        displayOrder: beforeImg.display_order,
      });
    }
  }
  // Note: Variant snapshots are not directly linked to product snapshots in the schema.
  // The product snapshot captures product-level fields (name, description, base_price, category_id, images).
  // Variant snapshots are separate entities linked to product_variants.
  // For a complete comparison, we would need variant snapshots at the exact time of product snapshot creation,
  // but the current schema doesn't provide this direct linkage.
  // Returning empty arrays for variant comparisons as we cannot reliably determine variant state at snapshot time.
  return {
    beforeSnapshotId: beforeSnapshot.id,
    afterSnapshotId: afterSnapshot.id,
    beforeSnapshotCreatedAt: beforeSnapshot.created_at.toISOString(),
    afterSnapshotCreatedAt: afterSnapshot.created_at.toISOString(),
    fieldDiff: {
      name: nameComparison,
      description: descriptionComparison,
      basePrice: basePriceComparison,
      categoryId: categoryIdComparison,
    },
    images: {
      added: addedImages,
      removed: removedImages,
      reordered: reorderedImages,
      unchanged: unchangedImages,
    },
    variants: {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
    },
  };
}
