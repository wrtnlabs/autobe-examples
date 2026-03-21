import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify order exists and belongs to the requesting customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  // Authorization: Verify customer owns this order
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build date range filter
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  // Build WHERE clause with filters
  const whereInput = {
    ecommerce_mall_order_id: props.orderId,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.product_id !== undefined && {
      ecommerce_mall_product_id: props.body.product_id,
    }),
    ...(props.body.variant_id !== undefined && {
      ecommerce_mall_product_variant_id: props.body.variant_id,
    }),
    ...(props.body.seller_id !== undefined && {
      product: {
        ecommerce_mall_seller_id: props.body.seller_id,
      },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Determine sort configuration
  const sortField = props.body.sort_by ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput = (
    sortField === "unit_price"
      ? { unit_price: sortDirection as "asc" | "desc" }
      : sortField === "quantity"
        ? { quantity: sortDirection as "asc" | "desc" }
        : { created_at: sortDirection as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  // Pagination
  const limit = Math.min(props.body.limit ?? 20, 100);
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Query order items
  const items = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    take: limit,
    skip: skip,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  // Transform response
  const transformedItems = await ArrayUtil.asyncMap(
    items,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedItems,
  };
}
