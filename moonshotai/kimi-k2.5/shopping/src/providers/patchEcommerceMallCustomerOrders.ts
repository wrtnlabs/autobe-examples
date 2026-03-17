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
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.ecommerce_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  };
  // Apply status filter if provided
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }
  // Apply date range filters - parse ISO strings to Date for Prisma
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdAfter !== null
  ) {
    where.created_at = {
      ...((where.created_at as Prisma.DateTimeFilter) ?? {}),
      gte: new Date(props.body.createdAfter),
    };
  }
  if (
    props.body.createdBefore !== undefined &&
    props.body.createdBefore !== null
  ) {
    where.created_at = {
      ...((where.created_at as Prisma.DateTimeFilter) ?? {}),
      lte: new Date(props.body.createdBefore),
    };
  }
  // Execute queries sequentially (not parallel to avoid duplicate filtering logic)
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where,
  });
  // Transform results using transformer
  const transformedOrders = await ArrayUtil.asyncMap(
    orders,
    EcommerceMallOrderAtSummaryTransformer.transform,
  );
  // Build pagination response
  return {
    data: transformedOrders,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
