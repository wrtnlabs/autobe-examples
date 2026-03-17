import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function getShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unavailable: true,
          created_at: true,
          updated_at: true,
          variant: {
            select: {
              id: true,
              sku_code: true,
              option_values: true,
              price: true,
              created_at: true,
              inventoryRecords: {
                select: {
                  quantity_change: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "asc" as const,
        },
      },
    },
  });
  if (cart === null) {
    return {
      id: null,
      items: [],
      total_price: 0,
      created_at: null,
      updated_at: null,
    };
  }
  const items = await ArrayUtil.asyncMap(cart.items, async (item) => {
    const stockQuantity = item.variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return {
      id: item.id,
      quantity: item.quantity,
      unavailable: item.unavailable,
      variant: {
        id: item.variant.id,
        skuCode: item.variant.sku_code,
        optionValues: JSON.parse(item.variant.option_values) as Record<
          string,
          string
        >,
        price: item.variant.price,
        stockQuantity,
        createdAt: item.variant.created_at.toISOString(),
      },
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
    };
  });
  const total_price = items.reduce(
    (sum, item) => sum + item.quantity * (item.variant.price ?? 0),
    0,
  );
  return {
    id: cart.id,
    items,
    total_price,
    created_at: cart.created_at.toISOString(),
    updated_at: cart.updated_at.toISOString(),
  };
}
