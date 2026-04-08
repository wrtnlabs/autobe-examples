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

export async function patchMallPlatformSellerOrderItemsOrderItemIdSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshot.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
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
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
      where: {
        mall_platform_order_item_id: props.orderItemId,
        ...(props.body.search !== undefined && props.body.search.length > 0
          ? {
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
                {
                  seller_logo_image_url: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy:
        props.body.sort === "createdAt_asc"
          ? { created_at: "asc" }
          : props.body.sort === "snapshotAt_asc"
            ? { snapshot_at: "asc" }
            : props.body.sort === "createdAt_desc"
              ? { created_at: "desc" }
              : { snapshot_at: "desc" },
      skip,
      take: limit,
      ...MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_order_item_snapshots.count({
    where: {
      mall_platform_order_item_id: props.orderItemId,
      ...(props.body.search !== undefined && props.body.search.length > 0
        ? {
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
              {
                seller_logo_image_url: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
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
// export async function patchMallPlatformSellerOrderItemsOrderItemIdSnapshots(props: {
//   seller: SellerPayload;
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