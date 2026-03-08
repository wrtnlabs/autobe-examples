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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  if (page < 1 || limit < 1 || limit > 50) {
    throw new HttpException("Invalid pagination parameters", 400);
  }
  const offset: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && {
      overall_status: props.body.status,
    }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.searchTerm && {
      order_number: {
        contains: props.body.searchTerm,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput = (
    props.body.sortBy === "total_price"
      ? {
          total_price: props.body.sortOrder === "ASC" ? "asc" : "desc",
        }
      : { created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_ordersOrderByWithRelationInput;
  const total: number = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  const data: Array<
    Prisma.ecommerce_mall_ordersGetPayload<
      ReturnType<typeof EcommerceMallOrderAtSummaryTransformer.select>
    >
  > = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...EcommerceMallOrderAtSummaryTransformer.select(),
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
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallOrder.ISummary;
}
