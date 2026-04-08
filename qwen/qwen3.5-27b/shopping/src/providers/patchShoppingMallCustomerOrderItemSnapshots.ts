import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_order_item_snapshotsWhereInput = {
    orderItem: {
      ...(props.body.order_id && {
        order: {
          id: props.body.order_id,
        },
      }),
      ...(props.body.product_id && {
        productVariant: {
          product: {
            id: props.body.product_id,
          },
        },
      }),
      ...(props.body.variant_id && {
        product_variant_id: props.body.variant_id,
      }),
      ...(props.body.seller_id && {
        seller_id: props.body.seller_id,
      }),
      ...(props.body.customer_id && {
        customer_id: props.body.customer_id,
      }),
    },
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  };
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder = typia.assert<Prisma.SortOrder>(
    props.body.sortOrder ?? "desc",
  );
  const orderByInput: Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput =
    (
      sortField === "created_at"
        ? { created_at: sortOrder }
        : sortField === "id"
          ? { id: sortOrder }
          : { created_at: "desc" }
    ) satisfies Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
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
      data,
      ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
// import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerOrderItemSnapshots(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallOrderItemSnapshot.IRequest;
// }): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
//     ...ShoppingMallOrderItemSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------