import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformReviewAtSummaryTransformer } from "../transformers/MallPlatformReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformReview.IRequest;
}): Promise<IPageIMallPlatformReview.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_reviewsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.search === undefined
      ? {}
      : {
          content: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
  };
  const records = await MyGlobal.prisma.mall_platform_reviews.findMany({
    ...MallPlatformReviewAtSummaryTransformer.select(),
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const recordsCount = await MyGlobal.prisma.mall_platform_reviews.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformReviewAtSummaryTransformer.transform,
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
// import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
// import { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformProductsProductIdReviews(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformReview.IRequest;
// }): Promise<IPageIMallPlatformReview.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_reviews.findMany({
//     ...MallPlatformReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------