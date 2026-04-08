import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformRefundRequestAtSummaryTransformer } from "../transformers/MallPlatformRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdRefundRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequest.IRequest;
}): Promise<IPageIMallPlatformRefundRequest.ISummary> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_seller_id: true,
      },
    });
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const where = {
    mall_platform_order_item_id: props.orderItemId,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.customerId !== undefined
      ? { mall_platform_customer_id: props.body.customerId }
      : {}),
    ...(props.body.sellerId !== undefined
      ? { mall_platform_seller_id: props.body.sellerId }
      : {}),
    ...(props.body.administratorId !== undefined
      ? { mall_platform_administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.hasReviewed !== undefined
      ? { reviewed_at: props.body.hasReviewed ? { not: null } : null }
      : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" } },
            { review_note: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_refund_requestsWhereInput;
  const orderBy = (
    props.body.sort === "status"
      ? { status: "asc" }
      : props.body.sort === "reviewedAt"
        ? { reviewed_at: "desc" }
        : props.body.sort === "updatedAt"
          ? { updated_at: "desc" }
          : { created_at: "desc" }
  ) satisfies Prisma.mall_platform_refund_requestsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.mall_platform_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...MallPlatformRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_refund_requests.count({
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
      MallPlatformRefundRequestAtSummaryTransformer.transform,
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
// import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
// import { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerOrderItemsOrderItemIdRefundRequests(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformRefundRequest.IRequest;
// }): Promise<IPageIMallPlatformRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_refund_requests.findMany({
//     ...MallPlatformRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------