import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  // Validate cart ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Extract filtering parameters from body (IRequest is string type)
  // Since IRequest is defined as string, we treat it as a status filter
  const statusFilter = typeof props.body === "string" ? props.body : undefined;

  // Build query conditions
  const whereConditions: Record<string, any> = {
    shopping_mall_cart_id: props.cartId,
    deleted_at: null,
  };

  if (statusFilter) {
    whereConditions.status = statusFilter;
  }

  // Query cart items with product variant details
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereConditions,
    include: {
      productVariant: {
        select: {
          id: true,
          sku: true,
          title: true,
          price: true,
          inventory_count: true,
          attributes: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Count total matching items
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereConditions,
  });

  // Map to response format
  const data: IShoppingMallCartItem[] = cartItems.map((item) => ({
    price: item.price,
  }));

  return {
    data,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: 1,
    },
  };
}
