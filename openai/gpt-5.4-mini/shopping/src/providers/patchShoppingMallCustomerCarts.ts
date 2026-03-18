import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart> {
  const current: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          account_status: true,
          banned_at: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      },
      cartItems: {
        where: {
          deleted_at: null,
        },
        orderBy: {
          created_at: "asc",
        },
        select: {
          id: true,
          quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              override_price: true,
              stock_quantity: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (cart === null) {
    return {
      pagination: {
        current,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const items = cart.cartItems.map((item) => {
    const unitPrice: number =
      item.productVariant.override_price ??
      item.productVariant.product.base_price;
    const subtotal: number = unitPrice * item.quantity;
    return {
      id: item.id,
      quantity: item.quantity,
      subtotal,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at:
        item.deleted_at === null ? null : item.deleted_at.toISOString(),
      productVariant: {
        id: item.productVariant.id,
        skuCode: item.productVariant.sku_code,
        overridePrice: item.productVariant.override_price,
        stockQuantity: item.productVariant.stock_quantity,
        created_at: item.productVariant.created_at.toISOString(),
        updated_at: item.productVariant.updated_at.toISOString(),
        deleted_at:
          item.productVariant.deleted_at === null
            ? null
            : item.productVariant.deleted_at.toISOString(),
        product: {
          id: item.productVariant.product.id,
          name: item.productVariant.product.name,
          description: item.productVariant.product.description,
          basePrice: item.productVariant.product.base_price,
          created_at: item.productVariant.product.created_at.toISOString(),
          updated_at: item.productVariant.product.updated_at.toISOString(),
          deleted_at:
            item.productVariant.product.deleted_at === null
              ? null
              : item.productVariant.product.deleted_at.toISOString(),
        },
      },
    };
  });
  const total: number = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    pagination: {
      current,
      limit,
      records: 1,
      pages: 1,
    },
    data: [
      {
        id: cart.id,
        customer: {
          id: cart.customer.id,
          email: cart.customer.email,
          accountStatus: cart.customer.account_status,
          bannedAt:
            cart.customer.banned_at === null
              ? null
              : cart.customer.banned_at.toISOString(),
          deletedAt:
            cart.customer.deleted_at === null
              ? null
              : cart.customer.deleted_at.toISOString(),
          createdAt: cart.customer.created_at.toISOString(),
          updatedAt: cart.customer.updated_at.toISOString(),
        } satisfies IShoppingMallCustomer.ISummary,
        created_at: cart.created_at.toISOString(),
        updated_at: cart.updated_at.toISOString(),
        deleted_at:
          cart.deleted_at === null ? null : cart.deleted_at.toISOString(),
        items,
        total,
      } as unknown as IShoppingMallCart,
    ],
  };
}
