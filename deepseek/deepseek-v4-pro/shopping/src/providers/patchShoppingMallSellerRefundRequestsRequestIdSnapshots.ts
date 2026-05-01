import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerRefundRequestsRequestIdSnapshots(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  // Authorization: verify seller owns the product through FK chain
  // refund_request → order_item → product_variant → product → seller_id
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        orderItem: {
          select: {
            productVariant: {
              select: {
                product: {
                  select: {
                    shopping_mall_seller_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (
    refundRequest.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_refund_request_id: props.requestId,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to !== undefined
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_refund_request_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where: whereInput,
      ...ShoppingMallRefundRequestSnapshotAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where: whereInput,
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
      ShoppingMallRefundRequestSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
// import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerRefundRequestsRequestIdSnapshots(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallRefundRequestSnapshot.IRequest;
// }): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
//     ...ShoppingMallRefundRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallRefundRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------