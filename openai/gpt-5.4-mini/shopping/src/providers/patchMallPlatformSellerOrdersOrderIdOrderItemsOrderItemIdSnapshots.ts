import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemSnapshotAtSummaryTransformer } from "../transformers/MallPlatformOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrdersOrderIdOrderItemsOrderItemIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshot.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  await MyGlobal.prisma.mall_platform_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      mall_platform_order_id: props.orderId,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_order_item_id: props.orderItemId,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              order_item_status: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_sku: { contains: props.body.search, mode: "insensitive" },
            },
            {
              variant_sku_code: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_logo_image_url: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
    ...(props.body.snapshotAtFrom === undefined &&
    props.body.snapshotAtTo === undefined
      ? {}
      : {
          snapshot_at:
            props.body.snapshotAtFrom === undefined
              ? { lte: props.body.snapshotAtTo }
              : props.body.snapshotAtTo === undefined
                ? { gte: props.body.snapshotAtFrom }
                : {
                    gte: props.body.snapshotAtFrom,
                    lte: props.body.snapshotAtTo,
                  },
        }),
    ...(props.body.createdAtFrom === undefined &&
    props.body.createdAtTo === undefined
      ? {}
      : {
          created_at:
            props.body.createdAtFrom === undefined
              ? { lte: props.body.createdAtTo }
              : props.body.createdAtTo === undefined
                ? { gte: props.body.createdAtFrom }
                : {
                    gte: props.body.createdAtFrom,
                    lte: props.body.createdAtTo,
                  },
        }),
  } satisfies Prisma.mall_platform_order_item_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "createdAt_asc"
      ? { created_at: "asc" }
      : props.body.sort === "snapshotAt_asc"
        ? { snapshot_at: "asc" }
        : props.body.sort === "snapshotAt_desc"
          ? { snapshot_at: "desc" }
          : { created_at: "desc" }
  ) satisfies Prisma.mall_platform_order_item_snapshotsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_order_item_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderItemSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
// import { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
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
// export async function patchMallPlatformSellerOrdersOrderIdOrderItemsOrderItemIdSnapshots(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   orderItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrderItemSnapshot.IRequest;
// }): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
//     ...MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderItemSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------