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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomersOrders(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 20;
  const skip = page * limit;
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.orderNumber && {
      order_number: {
        contains: props.body.orderNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput = {
    ...(props.body.sort === "total_price"
      ? { total_price: props.body.order ?? "desc" }
      : props.body.sort === "status"
        ? { status: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" }),
  } satisfies Prisma.ecommerce_mall_ordersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
  };
}
