import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemAtSummaryTransformer } from "../transformers/MallPlatformOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItems(props: {
  seller: SellerPayload;
  body: IMallPlatformOrderItem.IRequest;
}): Promise<IPageIMallPlatformOrderItem.ISummary> {
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    throw new HttpException(
      "createdAt range filtering is not supported in this implementation",
      400,
    );
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "oldest" &&
    props.body.sort !== "status_asc" &&
    props.body.sort !== "status_desc"
  ) {
    throw new HttpException("Unsupported sort instruction", 400);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_order_itemsWhereInput = {
    deleted_at: null,
    mall_platform_seller_id: props.seller.id,
    ...(props.body.mallPlatformOrderId !== undefined
      ? { mall_platform_order_id: props.body.mallPlatformOrderId }
      : {}),
    ...(props.body.mallPlatformProductVariantId !== undefined
      ? {
          mall_platform_product_variant_id:
            props.body.mallPlatformProductVariantId,
        }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          OR: [
            { status: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_order_itemsWhereInput;
  const orderBy: Prisma.mall_platform_order_itemsOrderByWithRelationInput[] =
    props.body.sort === "oldest"
      ? [{ created_at: "asc" }]
      : props.body.sort === "status_asc"
        ? [{ status: "asc" }, { created_at: "desc" }]
        : props.body.sort === "status_desc"
          ? [{ status: "desc" }, { created_at: "desc" }]
          : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...MallPlatformOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_order_items.count({
    where,
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
      MallPlatformOrderItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMallPlatformOrderItem.ISummary;
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
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerOrderItems(props: {
//   seller: SellerPayload;
//   body: IMallPlatformOrderItem.IRequest;
// }): Promise<IPageIMallPlatformOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_order_items.findMany({
//     ...MallPlatformOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------