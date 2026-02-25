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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_ordersWhereInput = {
    ...(props.body.order_number && { id: props.body.order_number }),
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.status && { status: props.body.status }),
    created_at: {
      ...(props.body.created_at_start && { gte: props.body.created_at_start }),
      ...(props.body.created_at_end && { lte: props.body.created_at_end }),
    },
  };
  // Customer email substring match via join
  if (props.body.customer_email) {
    where.customer = {
      email: { contains: props.body.customer_email, mode: "insensitive" },
    };
  }
  // Seller shop name substring match via join through order_items
  if (props.body.seller_shop_name) {
    const sellerIds = (
      await MyGlobal.prisma.shopping_mall_customers.findMany({
        where: {
          display_name: {
            contains: props.body.seller_shop_name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      })
    ).map((c) => c.id);
    where.orderItems = {
      some: {
        seller: {
          id: { in: sellerIds },
        },
      },
    };
  }
  // Fetch paginated data
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_orders.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      orders,
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
