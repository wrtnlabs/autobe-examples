import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformOrderItemSnapshotAtSummaryTransformer } from "../transformers/MallPlatformOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemSnapshots(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformOrderItemSnapshot.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const safeLimit: number = limit > 0 ? limit : 20;
  const skip: number = (page - 1) * safeLimit;
  const where = {
    ...(props.body.snapshotReason !== undefined
      ? {
          snapshot_reason: {
            contains: props.body.snapshotReason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              snapshot_reason: {
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
              product_sku: {
                contains: props.body.search,
                mode: "insensitive",
              },
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
          ],
        }
      : {}),
    ...(props.body.snapshotAtFrom !== undefined ||
    props.body.snapshotAtTo !== undefined
      ? {
          snapshot_at: {
            ...(props.body.snapshotAtFrom !== undefined
              ? { gte: props.body.snapshotAtFrom }
              : {}),
            ...(props.body.snapshotAtTo !== undefined
              ? { lte: props.body.snapshotAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.mall_platform_order_item_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
      where,
      orderBy: [
        { snapshot_at: "desc" },
        { created_at: "desc" },
        { id: "desc" },
      ],
      skip,
      take: safeLimit,
      ...MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_order_item_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorOrderItemSnapshots(props: {
//   administrator: AdministratorPayload;
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