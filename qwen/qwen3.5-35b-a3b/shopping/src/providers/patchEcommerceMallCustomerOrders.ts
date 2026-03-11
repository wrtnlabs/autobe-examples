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
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * safeLimit;
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search && {
      order_number: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.overallStatus && {
      overall_status: props.body.overallStatus,
    }),
    ...(props.body.createdAtMin !== undefined && {
      created_at: { gte: props.body.createdAtMin },
    }),
    ...(props.body.createdAtMax !== undefined && {
      created_at: { lte: props.body.createdAtMax },
    }),
    ...(props.body.totalPriceMin !== undefined && {
      total_price: { gte: props.body.totalPriceMin },
    }),
    ...(props.body.totalPriceMax !== undefined && {
      total_price: { lte: props.body.totalPriceMax },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput[] = (
    props.body.sortBy === "totalPrice"
      ? [{ total_price: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
      : [{ created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
  ) satisfies Prisma.ecommerce_mall_ordersOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: safeLimit,
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
