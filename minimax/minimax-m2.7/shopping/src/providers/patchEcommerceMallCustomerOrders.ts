import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const whereConditions: Prisma.ecommerce_mall_ordersWhereInput[] = [];
  // Only return orders belonging to the authenticated customer (data isolation)
  whereConditions.push({
    ecommerce_mall_customer_id: props.customer.id,
  });
  // Soft delete filter: only return non-deleted orders
  whereConditions.push({
    deleted_at: null,
  });
  // Filter by order status if provided
  if (props.body.status !== undefined) {
    whereConditions.push({
      status: props.body.status,
    });
  }
  // Filter by order number (partial match)
  if (props.body.orderNumber !== undefined) {
    whereConditions.push({
      order_number: {
        contains: props.body.orderNumber,
        mode: "insensitive",
      },
    });
  }
  // Filter by created date range
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    whereConditions.push({
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    });
  }
  // Combine all where conditions with AND
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  // Execute queries sequentially (findMany first, then count)
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  // Transform orders to response format
  const transformedOrders = await ArrayUtil.asyncMap(
    orders,
    EcommerceMallOrderAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedOrders,
  };
}
