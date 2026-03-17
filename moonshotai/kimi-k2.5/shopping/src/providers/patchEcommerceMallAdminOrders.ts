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

export async function patchEcommerceMallAdminOrders(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const dateFilters: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdAfter !== null
  ) {
    dateFilters.gte = new Date(props.body.createdAfter);
  }
  if (
    props.body.createdBefore !== undefined &&
    props.body.createdBefore !== null
  ) {
    dateFilters.lte = new Date(props.body.createdBefore);
  }
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.customerId !== undefined &&
      props.body.customerId !== null && { customer_id: props.body.customerId }),
    ...(Object.keys(dateFilters).length > 0 && { created_at: dateFilters }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({ where }),
  ]);
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
