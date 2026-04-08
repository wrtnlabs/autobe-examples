import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function patchMallPlatformSellerShipmentsEligibleOrderItems(props: {
  seller: SellerPayload;
  body: IMallPlatformOrderItem.IRequest;
}): Promise<IPageIMallPlatformOrderItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const records = await MyGlobal.prisma.mall_platform_order_items.findMany({
    ...MallPlatformOrderItemAtSummaryTransformer.select(),
    where: {
      mall_platform_seller_id: props.seller.id,
      deleted_at: null,
      status: { notIn: ["cancelled", "refunded", "shipped", "delivered"] },
      ...(props.body.mallPlatformOrderId !== undefined
        ? { mall_platform_order_id: props.body.mallPlatformOrderId }
        : {}),
      ...(props.body.mallPlatformProductVariantId !== undefined
        ? {
            mall_platform_product_variant_id:
              props.body.mallPlatformProductVariantId,
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const recordsCount = await MyGlobal.prisma.mall_platform_order_items.count({
    where: {
      mall_platform_seller_id: props.seller.id,
      deleted_at: null,
      status: { notIn: ["cancelled", "refunded", "shipped", "delivered"] },
      ...(props.body.mallPlatformOrderId !== undefined
        ? { mall_platform_order_id: props.body.mallPlatformOrderId }
        : {}),
      ...(props.body.mallPlatformProductVariantId !== undefined
        ? {
            mall_platform_product_variant_id:
              props.body.mallPlatformProductVariantId,
          }
        : {}),
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: recordsCount === 0 ? 0 : Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderItemAtSummaryTransformer.transform,
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
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerShipmentsEligibleOrderItems(props: {
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