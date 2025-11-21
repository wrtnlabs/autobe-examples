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
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  // Verify cart exists and belongs to customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Build where conditions
  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_cart_id: props.cartId,
    };

    // Quantity range filtering
    if (
      props.body.quantity_min !== undefined ||
      props.body.quantity_max !== undefined
    ) {
      conditions.quantity = {};
      if (props.body.quantity_min !== undefined)
        (conditions.quantity as Record<string, unknown>).gte =
          props.body.quantity_min;
      if (props.body.quantity_max !== undefined)
        (conditions.quantity as Record<string, unknown>).lte =
          props.body.quantity_max;
    }

    // Price range filtering
    if (
      props.body.price_min !== undefined ||
      props.body.price_max !== undefined
    ) {
      conditions.unit_price = {};
      if (props.body.price_min !== undefined)
        (conditions.unit_price as Record<string, unknown>).gte =
          props.body.price_min;
      if (props.body.price_max !== undefined)
        (conditions.unit_price as Record<string, unknown>).lte =
          props.body.price_max;
    }

    // Date range filtering (using string comparison since we avoid Date objects)
    if (
      props.body.added_after !== undefined ||
      props.body.added_before !== undefined
    ) {
      conditions.added_at = {};
      if (props.body.added_after !== undefined)
        (conditions.added_at as Record<string, unknown>).gte =
          props.body.added_after;
      if (props.body.added_before !== undefined)
        (conditions.added_at as Record<string, unknown>).lte =
          props.body.added_before;
    }

    // Notes search
    if (props.body.notes) {
      conditions.notes = {
        contains: props.body.notes,
        mode: "insensitive",
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  // Handle search term across product variant relations
  if (props.body.search) {
    whereCondition.productVariant = {
      OR: [
        { variant_name: { contains: props.body.search, mode: "insensitive" } },
        { sku: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }

  // Pagination setup with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 1000); // Cap at 1000
  const skip = (page - 1) * limit;

  // Sort configuration
  const orderBy: Record<string, unknown> = {};
  if (props.body.sort_by) {
    switch (props.body.sort_by) {
      case "added_at":
        orderBy.added_at = props.body.order === "desc" ? "desc" : "asc";
        break;
      case "unit_price":
        orderBy.unit_price = props.body.order === "desc" ? "desc" : "asc";
        break;
      case "quantity":
        orderBy.quantity = props.body.order === "desc" ? "desc" : "asc";
        break;
    }
  } else {
    orderBy.added_at = "desc"; // Default sort
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        cart: true,
        productVariant: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({
      where: whereCondition,
    }),
  ]);

  // Map to response format with proper null/undefined handling
  const mappedData = data.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    added_at: toISOStringSafe(item.added_at),
    updated_at: toISOStringSafe(item.updated_at),
    notes: item.notes ?? undefined,
    cart: {
      id: item.cart.id,
      status: item.cart.status,
      expires_at: toISOStringSafe(item.cart.expires_at),
      applied_coupon_code: item.cart.applied_coupon_code ?? undefined,
      shipping_method: item.cart.shipping_method ?? undefined,
      estimated_shipping_cost: item.cart.estimated_shipping_cost ?? undefined,
      created_at: toISOStringSafe(item.cart.created_at),
      updated_at: toISOStringSafe(item.cart.updated_at),
    },
    product_variant: {
      id: item.productVariant.id,
      variant_name: item.productVariant.variant_name,
      sku: item.productVariant.sku,
      price: item.productVariant.price ?? 0,
      stock_quantity: item.productVariant.stock_quantity,
      active: item.productVariant.active,
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
