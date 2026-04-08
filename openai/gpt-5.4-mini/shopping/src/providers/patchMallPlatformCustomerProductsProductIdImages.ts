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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerProductsProductIdImages(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentImages =
    await MyGlobal.prisma.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        sort_order: "asc",
      },
      ...MallPlatformProductImageAtSummaryTransformer.select(),
    });
  const requestedImages = props.body.images;
  if (requestedImages.length !== currentImages.length) {
    throw new HttpException("Invalid image order", 400);
  }
  const currentIds = new Set<string>();
  for (const image of currentImages) currentIds.add(image.id);
  const requestedIds = new Set<string>();
  for (const image of requestedImages) {
    if (requestedIds.has(image.id)) {
      throw new HttpException("Invalid image order", 400);
    }
    if (!currentIds.has(image.id)) {
      throw new HttpException("Invalid image target", 400);
    }
    requestedIds.add(image.id);
  }
  for (const image of currentImages) {
    if (!requestedIds.has(image.id)) {
      throw new HttpException("Invalid image order", 400);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (let index = 0; index < requestedImages.length; ++index) {
      await prisma.mall_platform_product_images.update({
        where: {
          id: requestedImages[index].id,
        },
        data: {
          sort_order: index + 1,
          is_main: index === 0,
          updated_at: new Date(),
        },
      });
    }
  });
  const records = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      sort_order: "asc",
    },
    ...MallPlatformProductImageAtSummaryTransformer.select(),
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records.length,
      pages: records.length === 0 ? 0 : Math.ceil(records.length / limit),
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerProductsProductIdImages(props: {
//   customer: CustomerPayload;
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