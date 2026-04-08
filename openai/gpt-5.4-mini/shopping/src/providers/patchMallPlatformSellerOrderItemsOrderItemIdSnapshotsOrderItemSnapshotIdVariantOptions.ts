import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdSnapshotsOrderItemSnapshotIdVariantOptions(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  orderItemSnapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findUniqueOrThrow({
      where: { id: props.orderItemSnapshotId },
      select: {
        id: true,
        mall_platform_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            mall_platform_seller_id: true,
          },
        },
      },
    });
  if (snapshot.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshot.orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findMany(
      {
        where: {
          mall_platform_order_item_snapshot_id: props.orderItemSnapshotId,
          deleted_at: null,
          ...(props.body.search === undefined || props.body.search.length === 0
            ? {}
            : {
                OR: [
                  {
                    option_name: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    option_value: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                ],
              }),
        },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        skip,
        take: limit,
        ...MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.count(
      {
        where: {
          mall_platform_order_item_snapshot_id: props.orderItemSnapshotId,
          deleted_at: null,
          ...(props.body.search === undefined || props.body.search.length === 0
            ? {}
            : {
                OR: [
                  {
                    option_name: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    option_value: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                ],
              }),
        },
      },
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary;
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
// import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
// import { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
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
// export async function patchMallPlatformSellerOrderItemsOrderItemIdSnapshotsOrderItemSnapshotIdVariantOptions(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   orderItemSnapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrderItemSnapshotVariantOption.IRequest;
// }): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findMany({
//     ...MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderItemSnapshotVariantOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------