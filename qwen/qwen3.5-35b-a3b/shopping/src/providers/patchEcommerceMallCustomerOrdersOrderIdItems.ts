import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // 1. Validate order exists and customer owns it
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Build WHERE clause for filtering
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    ecommerce_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      item_status: props.body.status,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          {
            product_snapshot: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            variant_snapshot: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            seller_profile_snapshot: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
  };
  // 3. Build ORDER BY clause
  const orderByInput: Array<Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput> =
    props.body.sortBy === "quantity"
      ? [{ quantity: props.body.sortOrder ?? "desc" }]
      : props.body.sortBy === "updated_at"
        ? [{ updated_at: props.body.sortOrder ?? "desc" }]
        : [{ created_at: props.body.sortOrder ?? "desc" }];
  // 4. Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // 5. Query order items
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      item_status: true,
      quantity: true,
      unit_price: true,
      product_snapshot: true,
      variant_snapshot: true,
      seller_profile_snapshot: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 6. Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  // 7. Transform results
  const transformedData = data.map(
    (item): IEcommerceMallOrderItem.ISummary => ({
      id: item.id,
      item_status: item.item_status,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_snapshot: JSON.parse(item.product_snapshot),
      variant_snapshot: JSON.parse(item.variant_snapshot),
      seller_profile_snapshot: JSON.parse(item.seller_profile_snapshot),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
    }),
  );
  // 8. Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
