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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerDashboardOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    orderItems: {
      some: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.total_price_min !== undefined && {
      total_price: { gte: props.body.total_price_min },
    }),
    ...(props.body.total_price_max !== undefined && {
      total_price: { lte: props.body.total_price_max },
    }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const orderByInput = (
    props.body.sort === "status"
      ? {
          status:
            props.body.sort_direction?.toLowerCase() === "asc" ? "asc" : "desc",
        }
      : props.body.sort === "total_price"
        ? {
            total_price:
              props.body.sort_direction?.toLowerCase() === "asc"
                ? "asc"
                : "desc",
          }
        : props.body.sort === "updated_at"
          ? {
              updated_at:
                props.body.sort_direction?.toLowerCase() === "asc"
                  ? "asc"
                  : "desc",
            }
          : { created_at: "desc" }
  ) satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
