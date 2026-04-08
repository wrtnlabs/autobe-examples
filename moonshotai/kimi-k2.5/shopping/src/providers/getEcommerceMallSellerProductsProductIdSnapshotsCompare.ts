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
    sourceSnapshotId: string & tags.Format<"uuid">;
    targetSnapshotId: (string & tags.Format<"uuid">) | null;
  };
}): Promise<IEcommerceMallProductSnapshotComparison> {
  // Verify product exists and check ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        name: true,
        description: true,
        ecommerce_mall_category_id: true,
        base_price: true,
      },
    });
  // Authorization: seller must own the product or be admin
  if (props.seller.type === "seller") {
    if (product.ecommerce_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (
    props.seller.type !== "admin" &&
    props.seller.type !== "superAdmin"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const { sourceSnapshotId, targetSnapshotId } = props.query;
  // Load source snapshot with images and variant snapshots
  const sourceSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: sourceSnapshotId,
        ecommerce_mall_product_id: props.productId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        ecommerce_mall_category_id: true,
        base_price: true,
        created_at: true,
        images: {
          select: {
            id: true,
            url: true,
            display_order: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
        variantSnapshots: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            optionValues: {
              select: {
                option_key: true,
                option_value: true,
              },
            } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs,
      },
    });
  // Define target data interface
  interface TargetData {
    name: string;
    description: string;
    category_id: string;
    base_price: number;
    images: Array<{
      id: string;
      url: string;
      display_order: number;
      created_at: string;
    }>;
    variants: Array<{
      id: string;
      sku_code: string;
      price: number;
      optionValues: Array<{
        option_key: string;
        option_value: string;
      }>;
    }>;
  }
  let targetData: TargetData;
  if (targetSnapshotId === null) {
    // Use current product state
    const currentVariants =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
        where: { ecommerce_mall_product_id: props.productId },
        select: {
          id: true,
          sku_code: true,
          price: true,
          options: {
            select: {
              option_key: true,
              option_value: true,
            },
          } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
        },
      });
    const currentImages =
      await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
        where: { ecommerce_mall_product_id: props.productId },
        select: {
          id: true,
          url: true,
          display_order: true,
          created_at: true,
        },
      });
    targetData = {
      name: product.name,
      description: product.description,
      category_id: product.ecommerce_mall_category_id,
      base_price: product.base_price,
      images: currentImages.map((img) => ({
        id: img.id,
        url: img.url,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
      })),
      variants: currentVariants.map((v) => ({
        id: v.id,
        sku_code: v.sku_code,
        price: v.price,
        optionValues: v.options.map((o) => ({
          option_key: o.option_key,
          option_value: o.option_value,
        })),
      })),
    };
  } else {
    // Use target snapshot
    const targetSnapshot =
      await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
        where: {
          id: targetSnapshotId,
          ecommerce_mall_product_id: props.productId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          ecommerce_mall_category_id: true,
          base_price: true,
          images: {
            select: {
              id: true,
              url: true,
              display_order: true,
              created_at: true,
            },
          } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
          variantSnapshots: {
            select: {
              id: true,
              sku_code: true,
              price: true,
              optionValues: {
                select: {
                  option_key: true,
                  option_value: true,
                },
              } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs,
            },
          } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs,
        },
      });
    targetData = {
      name: targetSnapshot.name,
      description: targetSnapshot.description,
      category_id: targetSnapshot.ecommerce_mall_category_id,
      base_price: targetSnapshot.base_price,
      images: targetSnapshot.images.map((img) => ({
        id: img.id,
        url: img.url,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
      })),
      variants: targetSnapshot.variantSnapshots.map((v) => ({
        id: v.id,
        sku_code: v.sku_code,
        price: v.price,
        optionValues: v.optionValues,
      })),
    };
  }
  // Transform source images to use string dates
  const sourceImages = sourceSnapshot.images.map((img) => ({
    id: img.id,
    url: img.url,
    display_order: img.display_order,
    created_at: toISOStringSafe(img.created_at),
  }));
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
    sourceSnapshot.ecommerce_mall_category_id !== targetData.category_id
      ? sourceSnapshot.ecommerce_mall_category_id
      : null;
  const categoryIdNew =
    sourceSnapshot.ecommerce_mall_category_id !== targetData.category_id
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
  const sourceImageMap = new Map(sourceImages.map((img) => [img.id, img]));
  const targetImageMap = new Map(targetData.images.map((img) => [img.id, img]));
  // Images added (in target but not in source)
  const imagesAdded: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  for (const targetImg of targetData.images) {
    if (!sourceImageMap.has(targetImg.id)) {
      imagesAdded.push({
        id: targetImg.id as string & tags.Format<"uuid">,
        url: targetImg.url as string & tags.Format<"uri">,
        display_order: targetImg.display_order as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        created_at: targetImg.created_at as string & tags.Format<"date-time">,
      });
    }
  }
  // Images removed (in source but not in target)
  const imagesRemoved: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  for (const sourceImg of sourceImages) {
    if (!targetImageMap.has(sourceImg.id)) {
      imagesRemoved.push({
        id: sourceImg.id as string & tags.Format<"uuid">,
        url: sourceImg.url as string & tags.Format<"uri">,
        display_order: sourceImg.display_order as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        created_at: sourceImg.created_at as string & tags.Format<"date-time">,
      });
    }
  }
  // Images reordered (same ID but different display_order)
  const imagesReordered: string[] = [];
  for (const sourceImg of sourceImages) {
    const targetImg = targetImageMap.get(sourceImg.id);
    if (targetImg && sourceImg.display_order !== targetImg.display_order) {
      imagesReordered.push(sourceImg.id);
    }
  }
  // Compare variants
  const sourceVariantMap = new Map(
    sourceSnapshot.variantSnapshots.map((v) => [v.id, v]),
  );
  const targetVariantMap = new Map(targetData.variants.map((v) => [v.id, v]));
  const variantsChanged: string[] = [];
  // Check for changed or removed variants
  for (const sourceVariant of sourceSnapshot.variantSnapshots) {
    const targetVariant = targetVariantMap.get(sourceVariant.id);
    if (!targetVariant) {
      variantsChanged.push(sourceVariant.id);
    } else {
      const skuChanged = sourceVariant.sku_code !== targetVariant.sku_code;
      const priceChanged = sourceVariant.price !== targetVariant.price;
      const sourceOptions = new Map(
        sourceVariant.optionValues.map((o) => [o.option_key, o.option_value]),
      );
      const targetOptions = new Map(
        targetVariant.optionValues.map((o) => [o.option_key, o.option_value]),
      );
      let optionsChanged = sourceOptions.size !== targetOptions.size;
      if (!optionsChanged) {
        for (const [key, value] of sourceOptions) {
          if (targetOptions.get(key) !== value) {
            optionsChanged = true;
            break;
          }
        }
      }
      if (skuChanged || priceChanged || optionsChanged) {
        variantsChanged.push(sourceVariant.id);
      }
    }
  }
  // Check for added variants
  for (const targetVariant of targetData.variants) {
    if (!sourceVariantMap.has(targetVariant.id)) {
      variantsChanged.push(targetVariant.id);
    }
  }
  return {
    sourceSnapshotId,
    targetSnapshotId,
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
// export async function getEcommerceMallSellerProductsProductIdSnapshotsCompare(props: {
//   seller: SellerPayload;
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