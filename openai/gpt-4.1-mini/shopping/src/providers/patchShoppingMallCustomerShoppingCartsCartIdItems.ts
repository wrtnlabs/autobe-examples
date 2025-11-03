import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const { customer, cartId, body } = props;

  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!cart)
    throw new HttpException("Shopping cart not found or access denied", 403);

  const inputSkuIds = body.items.map(
    (item) => item.shopping_mall_product_sku_id,
  );

  const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
    where: { id: { in: inputSkuIds }, deleted_at: null },
  });
  if (skus.length !== inputSkuIds.length) {
    throw new HttpException("One or more product SKUs do not exist", 400);
  }

  for (const item of body.items) {
    if (item.quantity < 1) {
      throw new HttpException("Quantity must be at least 1 for all items", 400);
    }
  }

  const existingItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany(
    {
      where: { shopping_mall_shopping_cart_id: cartId, deleted_at: null },
    },
  );
  const existingMap = new Map(
    existingItems.map((i) => [i.shopping_mall_product_sku_id, i]),
  );
  const inputMap = new Map(
    body.items.map((i) => [i.shopping_mall_product_sku_id, i]),
  );

  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (const inputItem of body.items) {
      const existing = existingMap.get(inputItem.shopping_mall_product_sku_id);
      if (existing) {
        if (existing.quantity !== inputItem.quantity) {
          await prisma.shopping_mall_cart_items.update({
            where: { id: existing.id },
            data: {
              quantity: inputItem.quantity,
              updated_at: toISOStringSafe(new Date()),
            },
          });
        }
      } else {
        await prisma.shopping_mall_cart_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            shopping_mall_shopping_cart_id: cartId,
            shopping_mall_product_sku_id:
              inputItem.shopping_mall_product_sku_id,
            quantity: inputItem.quantity,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
      }
    }

    for (const existingItem of existingItems) {
      if (!inputMap.has(existingItem.shopping_mall_product_sku_id)) {
        await prisma.shopping_mall_cart_items.update({
          where: { id: existingItem.id },
          data: {
            deleted_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
  });

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 100 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: { shopping_mall_shopping_cart_id: cartId, deleted_at: null },
      orderBy: { created_at: "asc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_shopping_cart_id: true,
        shopping_mall_product_sku_id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({
      where: { shopping_mall_shopping_cart_id: cartId, deleted_at: null },
    }),
  ]);

  const data = items.map((item) => ({
    id: item.id satisfies string & tags.Format<"uuid">,
    shopping_mall_shopping_cart_id:
      item.shopping_mall_shopping_cart_id satisfies string &
        tags.Format<"uuid">,
    shopping_mall_product_sku_id:
      item.shopping_mall_product_sku_id satisfies string & tags.Format<"uuid">,
    quantity: item.quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
