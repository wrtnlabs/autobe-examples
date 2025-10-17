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
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  const { customer, cartId, body } = props;

  // Verify cart ownership and existence
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause with seller filter
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: cartId,
        ...(body.seller_id !== undefined &&
          body.seller_id !== null && {
            sku: {
              product: {
                shopping_mall_seller_id: body.seller_id,
              },
            },
          }),
      },
      select: {
        id: true,
        quantity: true,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({
      where: {
        shopping_mall_cart_id: cartId,
        ...(body.seller_id !== undefined &&
          body.seller_id !== null && {
            sku: {
              product: {
                shopping_mall_seller_id: body.seller_id,
              },
            },
          }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    })),
  };
}
