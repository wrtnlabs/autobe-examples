import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentImages =
    await MyGlobal.prisma.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        mall_platform_product_id: true,
      },
    });
  if (currentImages.length !== props.body.images.length) {
    throw new HttpException("Invalid image ordering", 400);
  }
  const currentImageIds = new Set<string>();
  for (const image of currentImages) currentImageIds.add(image.id);
  const requestedImageIds = new Set<string>();
  for (const image of props.body.images) {
    if (requestedImageIds.has(image.id)) {
      throw new HttpException("Invalid image ordering", 400);
    }
    if (!currentImageIds.has(image.id)) {
      throw new HttpException("Invalid image ordering", 400);
    }
    requestedImageIds.add(image.id);
  }
  for (const image of currentImages) {
    if (!requestedImageIds.has(image.id)) {
      throw new HttpException("Invalid image ordering", 400);
    }
  }
  await MyGlobal.prisma.$transaction(
    props.body.images.map((image, index) =>
      MyGlobal.prisma.mall_platform_product_images.update({
        where: { id: image.id },
        data: {
          sort_order: index,
          is_main: index === 0,
          updated_at: new Date(),
        },
      }),
    ),
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const updatedImages =
    await MyGlobal.prisma.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      ...MallPlatformProductImageAtSummaryTransformer.select(),
    });
  const total = updatedImages.length;
  const pageImages = updatedImages.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      pageImages,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
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