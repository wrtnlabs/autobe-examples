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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const totalPriceFilter:
    | Prisma.FloatFilter<"ecommerce_mall_orders">
    | undefined =
    props.body.minTotalPrice !== null &&
    props.body.minTotalPrice !== undefined &&
    props.body.maxTotalPrice !== null &&
    props.body.maxTotalPrice !== undefined
      ? { gte: props.body.minTotalPrice, lte: props.body.maxTotalPrice }
      : props.body.minTotalPrice !== null &&
          props.body.minTotalPrice !== undefined
        ? { gte: props.body.minTotalPrice }
        : props.body.maxTotalPrice !== null &&
            props.body.maxTotalPrice !== undefined
          ? { lte: props.body.maxTotalPrice }
          : undefined;
  const createdAtFilter:
    | Prisma.DateTimeFilter<"ecommerce_mall_orders">
    | undefined =
    props.body.createdAfter !== null &&
    props.body.createdAfter !== undefined &&
    props.body.createdBefore !== null &&
    props.body.createdBefore !== undefined
      ? {
          gte: new Date(props.body.createdAfter),
          lte: new Date(props.body.createdBefore),
        }
      : props.body.createdAfter !== null &&
          props.body.createdAfter !== undefined
        ? { gte: new Date(props.body.createdAfter) }
        : props.body.createdBefore !== null &&
            props.body.createdBefore !== undefined
          ? { lte: new Date(props.body.createdBefore) }
          : undefined;
  const where: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    customer_id: props.customer.id,
    ...(props.body.status !== null &&
      props.body.status !== undefined && { status: props.body.status }),
    ...(totalPriceFilter !== undefined && { total_price: totalPriceFilter }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(props.body.orderNumber !== null &&
      props.body.orderNumber !== undefined && {
        order_number: { contains: props.body.orderNumber, mode: "insensitive" },
      }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
