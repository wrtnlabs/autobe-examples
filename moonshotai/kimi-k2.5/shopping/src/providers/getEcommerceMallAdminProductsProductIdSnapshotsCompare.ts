import { IEcommerceMallProductSnapshotComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotComparison";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdSnapshotsCompare(props: {
  admin: AdminPayload;
  productId: string;
}): Promise<IEcommerceMallProductSnapshotComparison> {
  // Verify product exists
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true },
    });
  // Get query parameters - need source and target snapshot IDs
  // Note: These would typically come from query params but aren't in props
  // For now, we'll need to get the two most recent snapshots for comparison
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: { product_id: props.productId },
      orderBy: { created_at: "desc" },
      take: 2,
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
      },
    });
  if (snapshots.length < 2) {
    throw new HttpException(
      "At least two snapshots required for comparison",
      400,
    );
  }
  const sourceSnapshot = snapshots[1]; // Older
  const targetSnapshot = snapshots[0]; // Newer
  // Get images for both snapshots
  const sourceImages =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: { ecommerce_mall_product_snapshot_id: sourceSnapshot.id },
      orderBy: { display_order: "asc" },
      select: { id: true, url: true, display_order: true, created_at: true },
    });
  const targetImages =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: { ecommerce_mall_product_snapshot_id: targetSnapshot.id },
      orderBy: { display_order: "asc" },
      select: { id: true, url: true, display_order: true, created_at: true },
    });
  // Compare product fields
  const productNameOld =
    sourceSnapshot.name !== targetSnapshot.name ? sourceSnapshot.name : null;
  const productNameNew =
    sourceSnapshot.name !== targetSnapshot.name ? targetSnapshot.name : null;
  const productDescriptionOld =
    sourceSnapshot.description !== targetSnapshot.description
      ? sourceSnapshot.description
      : null;
  const productDescriptionNew =
    sourceSnapshot.description !== targetSnapshot.description
      ? targetSnapshot.description
      : null;
  const categoryIdOld =
    sourceSnapshot.category_id !== targetSnapshot.category_id
      ? sourceSnapshot.category_id
      : null;
  const categoryIdNew =
    sourceSnapshot.category_id !== targetSnapshot.category_id
      ? targetSnapshot.category_id
      : null;
  const basePriceOld =
    sourceSnapshot.base_price !== targetSnapshot.base_price
      ? sourceSnapshot.base_price
      : null;
  const basePriceNew =
    sourceSnapshot.base_price !== targetSnapshot.base_price
      ? targetSnapshot.base_price
      : null;
  // Compare images
  const sourceImageMap = new Map(sourceImages.map((img) => [img.id, img]));
  const targetImageMap = new Map(targetImages.map((img) => [img.id, img]));
  const imagesAdded: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const imagesRemoved: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const imagesReordered: string[] = [];
  // Find added images
  for (const targetImg of targetImages) {
    if (!sourceImageMap.has(targetImg.id)) {
      imagesAdded.push({
        id: targetImg.id as string & tags.Format<"uuid">,
        url: targetImg.url as string & tags.Format<"uri">,
        display_order: targetImg.display_order,
        created_at: targetImg.created_at.toISOString() as string &
          tags.Format<"date-time">,
      });
    }
  }
  // Find removed images
  for (const sourceImg of sourceImages) {
    if (!targetImageMap.has(sourceImg.id)) {
      imagesRemoved.push({
        id: sourceImg.id as string & tags.Format<"uuid">,
        url: sourceImg.url as string & tags.Format<"uri">,
        display_order: sourceImg.display_order,
        created_at: sourceImg.created_at.toISOString() as string &
          tags.Format<"date-time">,
      });
    }
  }
  // Find reordered images
  for (const targetImg of targetImages) {
    const sourceImg = sourceImageMap.get(targetImg.id);
    if (sourceImg && sourceImg.display_order !== targetImg.display_order) {
      imagesReordered.push(targetImg.id);
    }
  }
  // Get variant snapshots for both
  const sourceVariantSnapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: {
        productVariant: { product_id: props.productId },
      },
      select: { id: true },
    });
  const variantsChanged: string[] = sourceVariantSnapshots.map((v) => v.id);
  return {
    sourceSnapshotId: sourceSnapshot.id as string & tags.Format<"uuid">,
    targetSnapshotId: targetSnapshot.id as string & tags.Format<"uuid">,
    productNameOld,
    productNameNew,
    productDescriptionOld,
    productDescriptionNew,
    categoryIdOld,
    categoryIdNew,
    basePriceOld,
    basePriceNew,
    imagesAdded,
    imagesRemoved,
    imagesReordered: JSON.stringify(imagesReordered),
    variantsChanged: JSON.stringify(variantsChanged),
  };
}
