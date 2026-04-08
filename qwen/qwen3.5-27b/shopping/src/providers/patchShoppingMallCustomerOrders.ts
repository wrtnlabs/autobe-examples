import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.order_number && {
      order_number: {
        contains: props.body.order_number,
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Fetch all matching orders (without pagination) for status filtering
  // This is necessary because status is derived from order items
  const allRecords = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    orderBy: {
      created_at: "desc",
    },
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  // Helper function to derive status from items
  const deriveStatus = (
    items: {
      status: string;
    }[],
  ): string => {
    const statuses = items.map((item) => item.status);
    if (statuses.every((s) => s === "delivered")) {
      return "delivered";
    } else if (statuses.every((s) => s === "cancelled")) {
      return "cancelled";
    } else if (statuses.every((s) => s === "refunded")) {
      return "refunded";
    } else if (statuses.some((s) => s === "shipped")) {
      return "shipped";
    } else if (statuses.every((s) => s === "paid")) {
      return "paid";
    } else {
      return "partially_completed";
    }
  };
  // Filter by status if provided
  const filteredRecords = props.body.status
    ? allRecords.filter(
        (order) => deriveStatus(order.items) === props.body.status,
      )
    : allRecords;
  // Apply pagination after filtering
  const paginatedRecords = filteredRecords.slice(skip, skip + limit);
  // Transform records
  const data = await ArrayUtil.asyncMap(
    paginatedRecords,
    ShoppingMallOrderAtSummaryTransformer.transform,
  );
  const totalCount = filteredRecords.length;
  const totalPages = Math.ceil(totalCount / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    },
    data,
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
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerOrders(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallOrder.IRequest;
// }): Promise<IPageIShoppingMallOrder.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_orders.findMany({
//     ...ShoppingMallOrderAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallOrderAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------