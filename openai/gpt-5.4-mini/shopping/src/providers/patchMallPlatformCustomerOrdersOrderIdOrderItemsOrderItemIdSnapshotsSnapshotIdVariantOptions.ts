import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformOrderItemSnapshotVariantOptionTransformer } from "../transformers/MallPlatformOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrdersOrderIdOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptions(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption> {
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        mall_platform_order_id: true,
      },
    });
  if (orderItem.mall_platform_order_id !== order.id) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        mall_platform_order_item_id: true,
      },
    });
  if (snapshot.mall_platform_order_item_id !== orderItem.id) {
    throw new HttpException("Not Found", 404);
  }
  const limit = 100;
  const total =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.count(
      {
        where: {
          mall_platform_order_item_snapshot_id: snapshot.id,
        },
      },
    );
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findMany(
      {
        where: {
          mall_platform_order_item_snapshot_id: snapshot.id,
        },
        skip: 0,
        take: limit,
        orderBy: [
          {
            created_at: "asc",
          },
          {
            id: "asc",
          },
        ],
        ...MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
      },
    );
  return {
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderItemSnapshotVariantOptionTransformer.transform,
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
// import { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
// import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
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
// export async function patchMallPlatformCustomerOrdersOrderIdOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptions(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   orderItemId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption> {
//   const records = await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findMany({
//     ...MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderItemSnapshotVariantOptionTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------