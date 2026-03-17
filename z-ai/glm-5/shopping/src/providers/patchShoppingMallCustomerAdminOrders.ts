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

export async function patchShoppingMallCustomerAdminOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date filter condition - using DateTimeFilter since created_at is NOT nullable
  const createdAtCondition: Prisma.DateTimeFilter<"shopping_mall_orders"> = {};
  if (props.body.createdFrom) {
    createdAtCondition.gte = new Date(props.body.createdFrom);
  }
  if (props.body.createdTo) {
    createdAtCondition.lte = new Date(props.body.createdTo);
  }
  // Build price filter condition - using FloatFilter instead of FloatNullableFilter
  // since total_price is not nullable
  const priceCondition: Prisma.FloatFilter<"shopping_mall_orders"> = {};
  if (props.body.minPrice !== undefined) {
    priceCondition.gte = props.body.minPrice;
  }
  if (props.body.maxPrice !== undefined) {
    priceCondition.lte = props.body.maxPrice;
  }
  // Build WHERE conditions
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.statuses &&
      props.body.statuses.length > 0 && {
        status: { in: props.body.statuses },
      }),
    ...(props.body.orderNumber && {
      order_number: {
        contains: props.body.orderNumber,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.customerId && {
      shopping_mall_customer_id: props.body.customerId,
    }),
    ...((props.body.createdFrom || props.body.createdTo) && {
      created_at: createdAtCondition,
    }),
    ...((props.body.minPrice !== undefined ||
      props.body.maxPrice !== undefined) && {
      total_price: priceCondition,
    }),
  };
  // Build ORDER BY
  const orderByInput = (() => {
    if (!props.body.sort) {
      return { created_at: "desc" as const };
    }
    const [field, direction] = props.body.sort.split(":");
    const dir = direction === "asc" ? ("asc" as const) : ("desc" as const);
    switch (field) {
      case "created_at":
        return {
          created_at: dir,
        } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
      case "total_price":
        return {
          total_price: dir,
        } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
      case "status":
        return {
          status: dir,
        } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
      case "order_number":
        return {
          order_number: dir,
        } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
      default:
        return {
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
    }
  })();
  // Query data and count
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    ...ShoppingMallOrderAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
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
