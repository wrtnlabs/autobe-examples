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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsCompare(props: {
  seller: SellerPayload;
  productId: string;
  query: {
    sourceSnapshotId: string;
    targetSnapshotId?: string;
  };
}): Promise<IEcommerceMallProductSnapshotComparison> {
  const { sourceSnapshotId, targetSnapshotId } = props.query;
  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category_id: true,
      base_price: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Load source snapshot with images
  const sourceSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: sourceSnapshotId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        images: {
          select: {
            id: true,
            url: true,
            display_order: true,
            created_at: true,
          },
          orderBy: {
            display_order: "asc",
          },
        },
      },
    });
  // Verify source snapshot belongs to the product
  const sourceBelongsToProduct =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirst({
      where: {
        id: sourceSnapshotId,
        product_id: props.productId,
      },
      select: { id: true },
    });
  if (!sourceBelongsToProduct) {
    throw new HttpException("Source snapshot not found for this product", 404);
  }
  // Load target - either another snapshot or current product state
  type TargetData = {
    name: string;
    description: string;
    category_id: string;
    base_price: number;
    images: Array<{
      id: string;
      url: string;
      display_order: number;
      created_at: Date;
    }>;
  };
  let targetData: TargetData;
  if (targetSnapshotId) {
    const targetSnapshot =
      await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
        where: {
          id: targetSnapshotId,
        },
        select: {
          id: true,
          product_id: true,
          name: true,
          description: true,
          category_id: true,
          base_price: true,
          images: {
            select: {
              id: true,
              url: true,
              display_order: true,
              created_at: true,
            },
            orderBy: {
              display_order: "asc",
            },
          },
        },
      });
    if (targetSnapshot.product_id !== props.productId) {
      throw new HttpException(
        "Target snapshot not found for this product",
        404,
      );
    }
    targetData = {
      name: targetSnapshot.name,
      description: targetSnapshot.description,
      category_id: targetSnapshot.category_id,
      base_price: targetSnapshot.base_price,
      images: targetSnapshot.images,
    };
  } else {
    // Load current product images
    const currentImages =
      await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
        where: {
          product_id: props.productId,
        },
        select: {
          id: true,
          image_url: true,
          display_order: true,
          created_at: true,
        },
        orderBy: {
          display_order: "asc",
        },
      });
    targetData = {
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      base_price: product.base_price,
      images: currentImages.map((img) => ({
        id: img.id,
        url: img.image_url,
        display_order: img.display_order,
        created_at: img.created_at,
      })),
    };
  }
  // Compare product fields
  const productNameOld =
    sourceSnapshot.name !== targetData.name ? sourceSnapshot.name : null;
  const productNameNew =
    sourceSnapshot.name !== targetData.name ? targetData.name : null;
  const productDescriptionOld =
    sourceSnapshot.description !== targetData.description
      ? sourceSnapshot.description
      : null;
  const productDescriptionNew =
    sourceSnapshot.description !== targetData.description
      ? targetData.description
      : null;
  const categoryIdOld =
    sourceSnapshot.category_id !== targetData.category_id
      ? sourceSnapshot.category_id
      : null;
  const categoryIdNew =
    sourceSnapshot.category_id !== targetData.category_id
      ? targetData.category_id
      : null;
  const basePriceOld =
    sourceSnapshot.base_price !== targetData.base_price
      ? sourceSnapshot.base_price
      : null;
  const basePriceNew =
    sourceSnapshot.base_price !== targetData.base_price
      ? targetData.base_price
      : null;
  // Compare images
  const sourceImageMap = new Map(
    sourceSnapshot.images.map((img) => [img.id, img]),
  );
  const targetImageMap = new Map(targetData.images.map((img) => [img.id, img]));
  const imagesAdded: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const imagesRemoved: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const imagesReordered: string[] = [];
  // Find added images
  for (const targetImg of targetData.images) {
    if (!sourceImageMap.has(targetImg.id)) {
      imagesAdded.push({
        id: targetImg.id,
        url: targetImg.url,
        display_order: targetImg.display_order,
        created_at: toISOStringSafe(targetImg.created_at),
      });
    }
  }
  // Find removed images
  for (const sourceImg of sourceSnapshot.images) {
    if (!targetImageMap.has(sourceImg.id)) {
      imagesRemoved.push({
        id: sourceImg.id,
        url: sourceImg.url,
        display_order: sourceImg.display_order,
        created_at: toISOStringSafe(sourceImg.created_at),
      });
    }
  }
  // Find reordered images
  for (const sourceImg of sourceSnapshot.images) {
    const targetImg = targetImageMap.get(sourceImg.id);
    if (targetImg && sourceImg.display_order !== targetImg.display_order) {
      imagesReordered.push(sourceImg.id);
    }
  }
  // Compare variants by loading all variant snapshots up to each point in time
  const sourceVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: {
        productVariant: {
          product_id: props.productId,
        },
        created_at: {
          lte: sourceSnapshot.created_at,
        },
      },
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
      },
      orderBy: [{ product_variant_id: "asc" }, { created_at: "desc" }],
    });
  // Get latest snapshot per variant for source
  const sourceVariantLatestMap = new Map<string, (typeof sourceVariants)[0]>();
  for (const variant of sourceVariants) {
    if (!sourceVariantLatestMap.has(variant.product_variant_id)) {
      sourceVariantLatestMap.set(variant.product_variant_id, variant);
    }
  }
  const variantsChanged: string[] = [];
  if (targetSnapshotId) {
    const targetSnapshotDate =
      await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUnique({
        where: { id: targetSnapshotId },
        select: { created_at: true },
      });
    if (!targetSnapshotDate) {
      throw new HttpException("Target snapshot not found", 404);
    }
    const targetVariants =
      await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
        where: {
          productVariant: {
            product_id: props.productId,
          },
          created_at: {
            lte: targetSnapshotDate.created_at,
          },
        },
        select: {
          id: true,
          product_variant_id: true,
          sku_code: true,
          price: true,
          optionValues: {
            select: {
              option_name: true,
              option_value: true,
            },
          },
        },
        orderBy: [{ product_variant_id: "asc" }, { created_at: "desc" }],
      });
    // Get latest snapshot per variant for target
    const targetVariantLatestMap = new Map<
      string,
      (typeof targetVariants)[0]
    >();
    for (const variant of targetVariants) {
      if (!targetVariantLatestMap.has(variant.product_variant_id)) {
        targetVariantLatestMap.set(variant.product_variant_id, variant);
      }
    }
    // Compare variants
    const allVariantIds = new Set([
      ...Array.from(sourceVariantLatestMap.keys()),
      ...Array.from(targetVariantLatestMap.keys()),
    ]);
    for (const variantId of allVariantIds) {
      const sourceVar = sourceVariantLatestMap.get(variantId);
      const targetVar = targetVariantLatestMap.get(variantId);
      if (!sourceVar || !targetVar) {
        // Variant was added or removed - add the existing one's ID
        if (sourceVar) variantsChanged.push(sourceVar.id);
        if (targetVar) variantsChanged.push(targetVar.id);
      } else if (
        sourceVar.sku_code !== targetVar.sku_code ||
        sourceVar.price !== targetVar.price ||
        !areOptionValuesEqual(sourceVar.optionValues, targetVar.optionValues)
      ) {
        variantsChanged.push(sourceVar.id);
      }
    }
  }
  return {
    sourceSnapshotId,
    targetSnapshotId: targetSnapshotId ?? null,
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
function areOptionValuesEqual(
  a: Array<{
    option_name: string;
    option_value: string;
  }>,
  b: Array<{
    option_name: string;
    option_value: string;
  }>,
): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) =>
    x.option_name.localeCompare(y.option_name),
  );
  const sortedB = [...b].sort((x, y) =>
    x.option_name.localeCompare(y.option_name),
  );
  return sortedA.every(
    (item, index) =>
      item.option_name === sortedB[index].option_name &&
      item.option_value === sortedB[index].option_value,
  );
}
