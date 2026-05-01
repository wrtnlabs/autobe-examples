import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductImageAtSummaryTransformer } from "../transformers/ShoppingMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProductsProductIdImages(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.search
      ? { image_url: { contains: props.body.search } }
      : {}),
    ...(props.body.display_order_min !== undefined ||
    props.body.display_order_max !== undefined
      ? {
          display_order: {
            ...(props.body.display_order_min !== undefined
              ? { gte: props.body.display_order_min }
              : {}),
            ...(props.body.display_order_max !== undefined
              ? { lte: props.body.display_order_max }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_product_imagesWhereInput;
  const orderByInput = (
    props.body.sort === "created_at"
      ? {
          created_at:
            props.body.order === "desc" ? ("desc" as const) : ("asc" as const),
        }
      : {
          display_order:
            props.body.order === "desc" ? ("desc" as const) : ("asc" as const),
        }
  ) satisfies Prisma.shopping_mall_product_imagesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductImageAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_product_images.count({
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
      data,
      ShoppingMallProductImageAtSummaryTransformer.transform,
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
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerProductsProductIdImages(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.IRequest;
// }): Promise<IPageIShoppingMallProductImage.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_images.findMany({
//     ...ShoppingMallProductImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------