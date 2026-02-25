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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    shopping_mall_customer_id: props.customer.id,
  };
  // Status filter (exact match)
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Order number filter (case-insensitive partial match)
  if (props.body.order_number !== undefined) {
    whereInput.order_number = {
      contains: props.body.order_number,
      mode: "insensitive",
    };
  }
  // Date range filter (handle both bounds correctly)
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Price range filter (handle both bounds correctly)
  const priceFilter: Prisma.FloatFilter = {};
  if (props.body.total_price_min !== undefined) {
    priceFilter.gte = props.body.total_price_min;
  }
  if (props.body.total_price_max !== undefined) {
    priceFilter.lte = props.body.total_price_max;
  }
  if (Object.keys(priceFilter).length > 0) {
    whereInput.total_price = priceFilter;
  }
  // Query orders with pagination
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
