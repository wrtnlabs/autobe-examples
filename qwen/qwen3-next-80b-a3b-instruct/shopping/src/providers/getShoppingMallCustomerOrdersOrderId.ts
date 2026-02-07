import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      order_number: true,
      status: true,
      total_amount: true,
      created_at: true,
      updated_at: true,
      orderItems: {
        where: {
          deleted_at: null,
        },
        select: {
          product_name: true,
          product_description: true,
          category_name: true,
          base_price: true,
          thumbnail_image: true,
          all_product_images: true,
          variant_sku: true,
          option_values: true,
          variant_price: true,
          stock_at_time_of_purchase: true,
          shop_name: true,
          shop_description: true,
          logo_url: true,
        },
      },
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  return {
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    orderItems: order.orderItems.map((item) => ({
      product_name: item.product_name,
      product_description: item.product_description,
      category_name: item.category_name,
      base_price: item.base_price,
      thumbnail_image: item.thumbnail_image,
      all_product_images: item.all_product_images,
      variant_sku: item.variant_sku,
      option_values: item.option_values,
      variant_price: item.variant_price,
      stock_at_time_of_purchase: item.stock_at_time_of_purchase,
      shop_name: item.shop_name,
      shop_description: item.shop_description,
      logo_url: item.logo_url,
    })),
  };
}
