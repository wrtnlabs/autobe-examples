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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrders(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
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
        created_at: { gte: props.body.createdAfter },
      }),
    ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null && {
        created_at: { lte: props.body.createdBefore },
      }),
    ...(props.body.orderNumber !== undefined &&
      props.body.orderNumber !== null && {
        order_number: { contains: props.body.orderNumber },
      }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
