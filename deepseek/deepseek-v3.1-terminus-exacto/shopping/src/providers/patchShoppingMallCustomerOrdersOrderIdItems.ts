import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Build WHERE conditions with proper null/undefined handling
  const whereCondition = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            product_name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          ...(props.body.search
            ? [{ product_attributes: { contains: props.body.search } }]
            : []),
        ],
      }),
    ...(props.body.min_quantity !== undefined && {
      quantity: { gte: props.body.min_quantity },
    }),
    ...(props.body.max_quantity !== undefined && {
      quantity: { lte: props.body.max_quantity },
    }),
    ...(props.body.min_unit_price !== undefined && {
      unit_price: { gte: props.body.min_unit_price },
    }),
    ...(props.body.max_unit_price !== undefined && {
      unit_price: { lte: props.body.max_unit_price },
    }),
    ...(props.body.seller_id && {
      shopping_mall_seller_id: props.body.seller_id,
    }),
  };

  // Build ORDER BY with explicit default
  const orderBy = props.body.order_by
    ? { [props.body.order_by]: props.body.order_direction || "asc" }
    : { created_at: Prisma.SortOrder.desc };

  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Fetch data and count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        productVariant: true,
        seller: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereCondition,
    }),
  ]);

  // Transform results efficiently
  const transformedData = data.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    product_name: item.product_name,
    product_attributes: item.product_attributes ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    order: {
      id: item.order.id,
      order_number: item.order.order_number,
      total_amount: item.order.total_amount,
      subtotal_amount: item.order.subtotal_amount,
      tax_amount: item.order.tax_amount,
      shipping_amount: item.order.shipping_amount,
      currency: item.order.currency,
      status: item.order.status,
      shipping_address: item.order.shipping_address,
      billing_address: item.order.billing_address,
      created_at: toISOStringSafe(item.order.created_at),
      updated_at: toISOStringSafe(item.order.updated_at),
      customer: {
        id: item.order.customer.id,
        email: item.order.customer.email,
        first_name: item.order.customer.first_name,
        last_name: item.order.customer.last_name,
        phone_number: item.order.customer.phone_number ?? undefined,
        status: item.order.customer.status,
        created_at: toISOStringSafe(item.order.customer.created_at),
        updated_at: item.order.customer.updated_at
          ? toISOStringSafe(item.order.customer.updated_at)
          : undefined,
      },
    },
    product_variant: {
      id: item.productVariant.id,
      variant_name: item.productVariant.variant_name,
      sku: item.productVariant.sku,
      price: item.productVariant.price ?? 0,
      stock_quantity: item.productVariant.stock_quantity,
      active: item.productVariant.active,
    },
    seller: {
      id: item.seller.id,
      business_name: item.seller.business_name,
      contact_person: item.seller.contact_person,
      email: item.seller.email,
      status: item.seller.status,
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
