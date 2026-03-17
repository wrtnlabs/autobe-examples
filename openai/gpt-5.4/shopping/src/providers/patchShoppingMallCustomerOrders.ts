import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "created_at_desc" &&
    props.body.sort !== "created_at_asc" &&
    props.body.sort !== "code_asc" &&
    props.body.sort !== "code_desc" &&
    props.body.sort !== "total_price_asc" &&
    props.body.sort !== "total_price_desc" &&
    props.body.sort !== "status_asc" &&
    props.body.sort !== "status_desc"
  ) {
    throw new HttpException("Unsupported sort rule", 400);
  }
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.code !== undefined
      ? {
          code: {
            contains: props.body.code,
          },
        }
      : {}),
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? {
                  gte: props.body.createdAtFrom,
                }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? {
                  lte: props.body.createdAtTo,
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
      : props.body.sort === "code_asc"
        ? ([
            { code: "asc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
        : props.body.sort === "code_desc"
          ? ([
              { code: "desc" },
              { id: "desc" },
            ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
          : props.body.sort === "total_price_asc"
            ? ([
                { total_price: "asc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
            : props.body.sort === "total_price_desc"
              ? ([
                  { total_price: "desc" },
                  { id: "desc" },
                ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
              : props.body.sort === "status_asc"
                ? ([
                    { status: "asc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
                : props.body.sort === "status_desc"
                  ? ([
                      { status: "desc" },
                      { id: "desc" },
                    ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[])
                  : ([
                      { created_at: "desc" },
                      { id: "desc" },
                    ] satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput[]);
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
