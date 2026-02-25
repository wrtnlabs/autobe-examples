import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
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

export async function patchEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceCartItem.IRequest;
}): Promise<IPageIEcommerceCartItem.ISummary> {
  const { page = 1, limit = 10 } = props.body;
  const skip = (page - 1) * limit;
  const take = limit;
  const data = await MyGlobal.prisma.ecommerce_cart_items.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    skip,
    take,
    select: {
      id: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer_id: true,
      product_variant_id: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          snapshots: true,
          inventories: true,
          options: true,
          orderItems: true,
          cartItems: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              created_at: true,
              category: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_cart_items.count({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    return {
      id: item.id,
      quantity: item.quantity,
      variant: {
        id: item.variant.id,
        sku_code: item.variant.sku_code,
        price: item.variant.price,
        created_at: toISOStringSafe(item.variant.created_at),
        updated_at: toISOStringSafe(item.variant.updated_at),
        deleted_at: item.variant.deleted_at
          ? toISOStringSafe(item.variant.deleted_at)
          : null,
        snapshots: item.variant.snapshots,
        inventories: item.variant.inventories,
        options: item.variant.options,
        orderItems: item.variant.orderItems,
        cartItems: item.variant.cartItems,
        product: {
          ...item.variant.product,
          created_at: toISOStringSafe(item.variant.product.created_at),
          category: {
            ...item.variant.product.category,
            created_at: toISOStringSafe(
              item.variant.product.category.created_at,
            ),
            updated_at: toISOStringSafe(
              item.variant.product.category.updated_at,
            ),
          },
        } satisfies IEcommerceProductVariant.ISummary,
      },
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
