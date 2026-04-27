import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallOrderItemStatusLogAtSummaryTransformer } from "../transformers/ECommerceMallOrderItemStatusLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

type ECommerceMallOrderItemStatusLogAtSummaryRecord = Parameters<
  typeof ECommerceMallOrderItemStatusLogAtSummaryTransformer.transform
>[0];
export async function patchECommerceMallSellerOrderItemsItemIdStatusLogs(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IECommerceMallOrderItemStatusLog.IRequest;
}): Promise<IPageIECommerceMallOrderItemStatusLog.ISummary> {
  // 1. Verify order item exists (404 via findUniqueOrThrow)
  const orderItem =
    await MyGlobal.prisma.e_commerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        productVariant: {
          select: {
            product: {
              select: {
                seller_id: true,
              },
            },
          },
        },
      },
    });
  // 2. Verify seller owns the product linked to this order item
  if (orderItem.productVariant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // 4. Build where clause with optional filters
  //
  // from_status can be:
  //   - undefined → don't filter on from_status at all
  //   - null → filter for records where from_status IS NULL (initial 'paid' entries)
  //   - string → filter for records with exact matching from_status
  const fromStatusFilter: string | null | undefined =
    props.body.from_status === undefined ? undefined : props.body.from_status;
  const whereInput = {
    e_commerce_mall_order_item_id: props.itemId,
    ...(props.body.to_status !== undefined && {
      to_status: props.body.to_status,
    }),
    ...(fromStatusFilter !== undefined && {
      from_status: fromStatusFilter,
    }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason },
      }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
  } satisfies Prisma.e_commerce_mall_order_item_status_logsWhereInput;
  // 5. Count total records matching filters (sequential - before findMany)
  const total: number =
    await MyGlobal.prisma.e_commerce_mall_order_item_status_logs.count({
      where: whereInput,
    });
  // 6. Query paginated records (sequential - after count)
  const records =
    (await MyGlobal.prisma.e_commerce_mall_order_item_status_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallOrderItemStatusLogAtSummaryTransformer.select(),
    })) as unknown as ECommerceMallOrderItemStatusLogAtSummaryRecord[];
  // 7. Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallOrderItemStatusLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallOrderItemStatusLog.ISummary;
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
// import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
// import { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerOrderItemsItemIdStatusLogs(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IECommerceMallOrderItemStatusLog.IRequest;
// }): Promise<IPageIECommerceMallOrderItemStatusLog.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_order_item_status_logs.findMany({
//     ...ECommerceMallOrderItemStatusLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallOrderItemStatusLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------