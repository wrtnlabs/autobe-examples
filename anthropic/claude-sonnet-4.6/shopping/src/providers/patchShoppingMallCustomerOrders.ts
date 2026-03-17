import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "desc";
  const createdAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_orders">
    | undefined =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          ...(props.body.createdAtFrom != null && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo != null && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.status != null && { status: props.body.status }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(props.body.recipientName != null && {
      recipient_name: {
        contains: props.body.recipientName,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: sort === "asc" ? ("asc" as const) : ("desc" as const),
    },
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
  };
}
