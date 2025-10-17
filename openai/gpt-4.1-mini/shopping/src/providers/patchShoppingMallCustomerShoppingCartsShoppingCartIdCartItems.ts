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

export async function patchShoppingMallCustomerShoppingCartsShoppingCartIdCartItems(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  const { customer, shoppingCartId, body } = props;

  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
    where: {
      id: shoppingCartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (cart === null) {
    throw new HttpException("Shopping cart not found or access denied", 403);
  }

  const whereClause = {
    shopping_mall_shopping_cart_id: shoppingCartId,
    ...(body.shopping_mall_sku_id !== undefined &&
      body.shopping_mall_sku_id !== null && {
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      }),
    ...(body.quantity !== undefined &&
      body.quantity !== null && { quantity: body.quantity }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
    deleted_at: null,
  };

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where: whereClause }),
  ]);

  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_shopping_cart_id: item.shopping_mall_shopping_cart_id,
    shopping_mall_sku_id: item.shopping_mall_sku_id,
    quantity: item.quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
