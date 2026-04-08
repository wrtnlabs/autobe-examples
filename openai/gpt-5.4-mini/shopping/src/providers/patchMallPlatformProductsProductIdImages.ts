import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    const currentImages = await tx.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const deleteIds: Set<string> = new Set(props.body.deleteImageIds);
    const existingIds: Set<string> = new Set(
      currentImages.map((image) => image.id),
    );
    for (const deleteId of deleteIds) {
      if (existingIds.has(deleteId) === false) {
        throw new HttpException("Unavailable product image target", 400);
      }
    }
    const requestedUrls: Set<string> = new Set();
    for (const image of props.body.images) {
      if (requestedUrls.has(image.imageUrl)) {
        throw new HttpException("Duplicated product image URL", 400);
      }
      requestedUrls.add(image.imageUrl);
    }
    const retainedImages = currentImages.filter(
      (image) => deleteIds.has(image.id) === false,
    );
    const retainedUrls: Set<string> = new Set(
      retainedImages.map((image) => image.image_url),
    );
    for (const image of props.body.images) {
      if (retainedUrls.has(image.imageUrl)) {
        throw new HttpException("Duplicated product image URL", 400);
      }
    }
    if (deleteIds.size > 0) {
      await tx.mall_platform_product_images.deleteMany({
        where: {
          mall_platform_product_id: props.productId,
          id: { in: Array.from(deleteIds) },
        },
      });
    }
    for (const [index, image] of props.body.images.entries()) {
      await tx.mall_platform_product_images.create({
        data: {
          id: v4(),
          product: { connect: { id: props.productId } },
          image_url: image.imageUrl,
          sort_order: retainedImages.length + index,
          is_main: retainedImages.length + index === 0,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    const finalImages = await tx.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    for (const [index, image] of finalImages.entries()) {
      await tx.mall_platform_product_images.update({
        where: { id: image.id },
        data: {
          sort_order: index,
          is_main: index === 0,
          updated_at: new Date(),
        },
      });
    }
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_product_images.count({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
    });
  const records = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: { sort_order: "asc" },
    skip,
    take: limit,
    ...MallPlatformProductImageAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductImageAtSummaryTransformer.transform,
    ),
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
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformProductsProductIdImages(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductImage.IRequest;
// }): Promise<IPageIMallPlatformProductImage.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_images.findMany({
//     ...MallPlatformProductImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------