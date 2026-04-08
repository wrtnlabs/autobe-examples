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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminOrders(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.customerId !== undefined &&
      props.body.customerId !== null && {
        customer_id: props.body.customerId,
      }),
    ...(props.body.minTotalPrice !== undefined &&
      props.body.minTotalPrice !== null && {
        total_price: { gte: props.body.minTotalPrice },
      }),
    ...(props.body.maxTotalPrice !== undefined &&
      props.body.maxTotalPrice !== null && {
        total_price: { lte: props.body.maxTotalPrice },
      }),
    ...(props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null && {
        created_at: { gte: new Date(props.body.createdAfter) },
      }),
    ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null && {
        created_at: { lte: new Date(props.body.createdBefore) },
      }),
    ...(props.body.orderNumber !== undefined &&
      props.body.orderNumber !== null && {
        order_number: {
          contains: props.body.orderNumber,
          mode: "insensitive" as const,
        },
      }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_orders.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    orders,
    EcommerceMallOrderAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
