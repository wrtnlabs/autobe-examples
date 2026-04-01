import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerAnalyticsOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const statusFilter = props.body.status
    ? Array.isArray(props.body.status)
      ? props.body.status
      : [props.body.status]
    : undefined;
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    orderItems: {
      some: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
    ...(props.body.search && {
      order_number: { contains: props.body.search },
    }),
    ...(props.body.ordered_at_from && {
      ordered_at: { gte: new Date(props.body.ordered_at_from) },
    }),
    ...(props.body.ordered_at_to && {
      ordered_at: { lte: new Date(props.body.ordered_at_to) },
    }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput =
    props.body.sort === "order_number"
      ? { order_number: props.body.direction ?? "desc" }
      : { ordered_at: props.body.direction ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderAtSummaryTransformer.transform,
  );
  const filteredData = statusFilter
    ? transformedData.filter((order) => statusFilter.includes(order.status))
    : transformedData;
  const filteredTotal = statusFilter ? filteredData.length : total;
  return {
    data: filteredData,
    pagination: {
      current: page,
      limit: limit,
      records: filteredTotal,
      pages: Math.ceil(filteredTotal / limit),
    } satisfies IPage.IPagination,
  };
}
