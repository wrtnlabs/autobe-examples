import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItemsOrderItemIdRefundRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  // Verify order item exists and belongs to seller
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: { seller_id: true },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date filter
  const dateFilter: Prisma.DateTimeFilter | undefined =
    props.body.requestedAtFrom !== undefined ||
    props.body.requestedAtTo !== undefined
      ? {
          ...(props.body.requestedAtFrom !== undefined && {
            gte: new Date(props.body.requestedAtFrom),
          }),
          ...(props.body.requestedAtTo !== undefined && {
            lte: new Date(props.body.requestedAtTo),
          }),
        }
      : undefined;
  // Build where clause
  const where = {
    order_item_id: props.orderItemId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(dateFilter !== undefined && { requested_at: dateFilter }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  // Query records
  const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { requested_at: "desc" },
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    },
  );
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerOrderItemsOrderItemIdRefundRequests(props: {
//   seller: SellerPayload;
//   orderItemId: string;
//   body: IEcommerceMallRefundRequest.IRequest;
// }): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
//     ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------