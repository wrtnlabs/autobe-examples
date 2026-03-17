import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      OR: [
        { order_number: { contains: props.body.search } },
        { customer: { email: { contains: props.body.search } } },
      ],
    }),
    ...(props.body.created_since && {
      created_at: { gte: new Date(props.body.created_since) },
    }),
    ...(props.body.created_before && {
      created_at: { lt: new Date(props.body.created_before) },
    }),
    ...(props.body.total_price_min !== undefined && {
      total_price: { gte: props.body.total_price_min },
    }),
    ...(props.body.total_price_max !== undefined && {
      total_price: { lte: props.body.total_price_max },
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const orderByInput = (
    props.body.sort === "status"
      ? { status: "asc" as const }
      : props.body.sort === "total_price"
        ? { total_price: "asc" as const }
        : props.body.sort === "customer_email"
          ? { customer: { email: "asc" as const } }
          : props.body.sort === "order_number"
            ? { order_number: "asc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_ordersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_orders.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallOrderAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
