import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductImageAtSummaryTransformer } from "../transformers/EcommercePlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductImage.IRequest;
}): Promise<IPageIEcommercePlatformProductImage.ISummary> {
  // Validate product exists
  await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_platform_product_id: props.productId,
    ...(props.body.showDeleted !== true && { deleted_at: null }),
    ...(props.body.search !== undefined && {
      uri: { contains: props.body.search },
    }),
  } satisfies Prisma.ecommerce_platform_product_imagesWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_product_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { order_index: "asc" },
      ...EcommercePlatformProductImageAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_product_images.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformProductImageAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommercePlatformProductImage.ISummary;
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
// import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
// import { IPageIEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformProductsProductIdImages(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductImage.IRequest;
// }): Promise<IPageIEcommercePlatformProductImage.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_product_images.findMany({
//     ...EcommercePlatformProductImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformProductImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------