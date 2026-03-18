import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdOrderItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    deleted_at: null,
    shopping_mall_order_id: props.orderId,
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.orderNumber !== undefined
      ? {
          order: {
            order_number: {
              contains: props.body.orderNumber,
              mode: "insensitive",
            },
          },
        }
      : {}),
    ...(props.body.productVariantId !== undefined
      ? { shopping_mall_product_variant_id: props.body.productVariantId }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
  };
  const orderBy =
    props.body.sort === "oldest"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput[])
      : props.body.sort === "status"
        ? ([
            { status: "asc" },
            { created_at: "desc" },
            { id: "desc" },
          ] satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput[])
        : props.body.sort === "quantity"
          ? ([
              { quantity: "desc" },
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput[])
          : ([
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput[]);
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
