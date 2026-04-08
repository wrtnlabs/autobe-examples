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
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Get all snapshots for this product to determine source and target
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: { product_id: props.productId },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
      },
    });
  if (snapshots.length === 0) {
    throw new HttpException("No snapshots found for this product", 404);
  }
  // If only one snapshot exists, compare it with the current product state
  if (snapshots.length === 1) {
    const sourceSnapshot = snapshots[0];
    const product =
      await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
        where: { id: props.productId },
        select: {
          name: true,
          description: true,
          category_id: true,
          base_price: true,
        },
      });
    const sourceImages =
      await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
        where: { snapshot_id: sourceSnapshot.id },
        orderBy: { display_order: "asc" },
        select: {
          id: true,
          url: true,
          display_order: true,
          created_at: true,
        },
      });
    const currentImages =
      await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
        where: { product_id: props.productId },
        orderBy: { display_order: "asc" },
        select: {
          id: true,
          image_uri: true,
          display_order: true,
          created_at: true,
        },
      });
    // Convert current images to snapshot image format for comparison
    const targetImagesForComparison = currentImages.map((img) => ({
      id: img.id,
      url: img.image_uri,
      display_order: img.display_order,
      created_at: img.created_at,
    }));
    const sourceImageIds = new Set(sourceImages.map((img) => img.id));
    const targetImageIds = new Set(currentImages.map((img) => img.id));
    const imagesAddedRaw = currentImages
      .filter((img) => !sourceImageIds.has(img.id))
      .map((img) => ({
        id: img.id,
        url: img.image_uri,
        display_order: img.display_order,
        created_at: img.created_at,
      }));
    const imagesRemovedRaw = sourceImages.filter(
      (img) => !targetImageIds.has(img.id),
    );
    const imagesAdded: IEcommerceMallProductSnapshotImage.ISummary[] =
      imagesAddedRaw.map((img) => ({
        id: img.id,
        url: img.url,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
      }));
    const imagesRemoved: IEcommerceMallProductSnapshotImage.ISummary[] =
      imagesRemovedRaw.map((img) => ({
        id: img.id,
        url: img.url,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
      }));
    const reorderedIds: string[] = [];
    for (const sourceImg of sourceImages) {
      const targetImg = targetImagesForComparison.find(
        (img) => img.id === sourceImg.id,
      );
      if (targetImg && targetImg.display_order !== sourceImg.display_order) {
        reorderedIds.push(sourceImg.id);
      }
    }
    // Get current variants for comparison
    const currentVariants =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
        where: { product_id: props.productId },
        select: {
          id: true,
          sku: true,
          price: true,
        },
      });
    const sourceVariantSnapshots =
      await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
        where: { snapshot_id: sourceSnapshot.id },
        select: {
          variant_snapshot_id: true,
          sku: true,
          price: true,
        },
      });
    const changedVariantIds: string[] = [];
    for (const sourceVar of sourceVariantSnapshots) {
      const currentVar = currentVariants.find(
        (v) => v.id === sourceVar.variant_snapshot_id,
      );
      if (
        currentVar &&
        (currentVar.sku !== sourceVar.sku ||
          currentVar.price !== sourceVar.price)
      ) {
        changedVariantIds.push(sourceVar.variant_snapshot_id);
      }
    }
    const sourceVariantIds = new Set(
      sourceVariantSnapshots.map((v) => v.variant_snapshot_id),
    );
    for (const currentVar of currentVariants) {
      if (!sourceVariantIds.has(currentVar.id)) {
        changedVariantIds.push(currentVar.id);
      }
    }
    return {
      sourceSnapshotId: sourceSnapshot.id,
      targetSnapshotId: null,
      productNameOld:
        sourceSnapshot.name !== product.name ? sourceSnapshot.name : null,
      productNameNew:
        sourceSnapshot.name !== product.name ? product.name : null,
      productDescriptionOld:
        sourceSnapshot.description !== product.description
          ? sourceSnapshot.description
          : null,
      productDescriptionNew:
        sourceSnapshot.description !== product.description
          ? product.description
          : null,
      categoryIdOld:
        sourceSnapshot.category_id !== product.category_id
          ? sourceSnapshot.category_id
          : null,
      categoryIdNew:
        sourceSnapshot.category_id !== product.category_id
          ? product.category_id
          : null,
      basePriceOld:
        sourceSnapshot.base_price !== product.base_price
          ? sourceSnapshot.base_price
          : null,
      basePriceNew:
        sourceSnapshot.base_price !== product.base_price
          ? product.base_price
          : null,
      imagesAdded,
      imagesRemoved,
      imagesReordered: reorderedIds.join(","),
      variantsChanged: changedVariantIds.join(","),
    };
  }
  // Compare first and last snapshots when multiple exist
  const sourceSnapshot = snapshots[0];
  const targetSnapshot = snapshots[snapshots.length - 1];
  const sourceImages =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: { snapshot_id: sourceSnapshot.id },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        url: true,
        display_order: true,
        created_at: true,
      },
    });
  const targetImages =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: { snapshot_id: targetSnapshot.id },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        url: true,
        display_order: true,
        created_at: true,
      },
    });
  const sourceImageIds = new Set(sourceImages.map((img) => img.id));
  const targetImageIds = new Set(targetImages.map((img) => img.id));
  const imagesAddedRaw = targetImages.filter(
    (img) => !sourceImageIds.has(img.id),
  );
  const imagesRemovedRaw = sourceImages.filter(
    (img) => !targetImageIds.has(img.id),
  );
  const imagesAdded: IEcommerceMallProductSnapshotImage.ISummary[] =
    imagesAddedRaw.map((img) => ({
      id: img.id,
      url: img.url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
    }));
  const imagesRemoved: IEcommerceMallProductSnapshotImage.ISummary[] =
    imagesRemovedRaw.map((img) => ({
      id: img.id,
      url: img.url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
    }));
  const reorderedIds: string[] = [];
  for (const sourceImg of sourceImages) {
    const targetImg = targetImages.find((img) => img.id === sourceImg.id);
    if (targetImg && targetImg.display_order !== sourceImg.display_order) {
      reorderedIds.push(sourceImg.id);
    }
  }
  const sourceVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: { snapshot_id: sourceSnapshot.id },
      select: {
        variant_snapshot_id: true,
        sku: true,
        price: true,
      },
    });
  const targetVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: { snapshot_id: targetSnapshot.id },
      select: {
        variant_snapshot_id: true,
        sku: true,
        price: true,
      },
    });
  const changedVariantIds: string[] = [];
  for (const sourceVar of sourceVariants) {
    const targetVar = targetVariants.find(
      (v) => v.variant_snapshot_id === sourceVar.variant_snapshot_id,
    );
    if (
      targetVar &&
      (targetVar.sku !== sourceVar.sku || targetVar.price !== sourceVar.price)
    ) {
      changedVariantIds.push(sourceVar.variant_snapshot_id);
    }
  }
  const sourceVariantIds = new Set(
    sourceVariants.map((v) => v.variant_snapshot_id),
  );
  for (const targetVar of targetVariants) {
    if (!sourceVariantIds.has(targetVar.variant_snapshot_id)) {
      changedVariantIds.push(targetVar.variant_snapshot_id);
    }
  }
  return {
    sourceSnapshotId: sourceSnapshot.id,
    targetSnapshotId: targetSnapshot.id,
    productNameOld:
      sourceSnapshot.name !== targetSnapshot.name ? sourceSnapshot.name : null,
    productNameNew:
      sourceSnapshot.name !== targetSnapshot.name ? targetSnapshot.name : null,
    productDescriptionOld:
      sourceSnapshot.description !== targetSnapshot.description
        ? sourceSnapshot.description
        : null,
    productDescriptionNew:
      sourceSnapshot.description !== targetSnapshot.description
        ? targetSnapshot.description
        : null,
    categoryIdOld:
      sourceSnapshot.category_id !== targetSnapshot.category_id
        ? sourceSnapshot.category_id
        : null,
    categoryIdNew:
      sourceSnapshot.category_id !== targetSnapshot.category_id
        ? targetSnapshot.category_id
        : null,
    basePriceOld:
      sourceSnapshot.base_price !== targetSnapshot.base_price
        ? sourceSnapshot.base_price
        : null,
    basePriceNew:
      sourceSnapshot.base_price !== targetSnapshot.base_price
        ? targetSnapshot.base_price
        : null,
    imagesAdded,
    imagesRemoved,
    imagesReordered: reorderedIds.join(","),
    variantsChanged: changedVariantIds.join(","),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductSnapshotComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotComparison";
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminProductsProductIdSnapshotsCompare(props: {
//   admin: AdminPayload;
//   productId: string;
// }): Promise<IEcommerceMallProductSnapshotComparison> {
//   return {
//     sourceSnapshotId: ...,
//     targetSnapshotId: ...,
//     productNameOld: ...,
//     productNameNew: ...,
//     productDescriptionOld: ...,
//     productDescriptionNew: ...,
//     categoryIdOld: ...,
//     categoryIdNew: ...,
//     basePriceOld: ...,
//     basePriceNew: ...,
//     imagesAdded: await ArrayUtil.asyncMap(..., (r) => EcommerceMallProductSnapshotImageAtSummaryTransformer.transform(r)),
//     imagesRemoved: await ArrayUtil.asyncMap(..., (r) => EcommerceMallProductSnapshotImageAtSummaryTransformer.transform(r)),
//     imagesReordered: ...,
//     variantsChanged: ...,
//   };
// }
// ```
//--------------------------------------------------------------