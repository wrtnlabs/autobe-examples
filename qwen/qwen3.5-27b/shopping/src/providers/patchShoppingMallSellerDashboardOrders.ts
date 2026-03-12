import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerDashboardOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for orders
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_at_start !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
    ...(props.body.total_price_min !== undefined && {
      total_price: {
        gte: props.body.total_price_min,
      },
    }),
    ...(props.body.total_price_max !== undefined && {
      total_price: {
        lte: props.body.total_price_max,
      },
    }),
    // Filter by orders that have at least one item from this seller
    orderItems: {
      some: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  // Build ORDER BY clause
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = (props.body.sort_direction ?? "desc").toLowerCase() as
    | "asc"
    | "desc";
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
  // Fetch paginated orders
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
