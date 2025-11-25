import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallCustomerShoppingMallCartsShoppingMallCartIdShoppingMallCartItems(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.shoppingMallCartId },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!cart) {
    throw new HttpException("Shopping mall cart not found", 404);
  }

  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const whereCondition: Prisma.shopping_mall_cart_itemsWhereInput = {
    shopping_mall_cart_id: props.shoppingMallCartId,
    deleted_at: props.body.deleted_at_null ? null : undefined,
    ...(props.body.shopping_mall_product_variant_id && {
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
    }),
    ...(props.body.quantity !== undefined &&
      props.body.quantity !== null && {
        quantity: props.body.quantity,
      }),
    ...(props.body.created_at_after || props.body.created_at_before
      ? {
          created_at: {
            ...(props.body.created_at_after && {
              gte: props.body.created_at_after,
            }),
            ...(props.body.created_at_before && {
              lte: props.body.created_at_before,
            }),
          },
        }
      : {}),
    ...(props.body.updated_at_after || props.body.updated_at_before
      ? {
          updated_at: {
            ...(props.body.updated_at_after && {
              gte: props.body.updated_at_after,
            }),
            ...(props.body.updated_at_before && {
              lte: props.body.updated_at_before,
            }),
          },
        }
      : {}),
    ...(props.body.deleted_at_after || props.body.deleted_at_before
      ? {
          deleted_at: {
            ...(props.body.deleted_at_after && {
              gte: props.body.deleted_at_after,
            }),
            ...(props.body.deleted_at_before && {
              lte: props.body.deleted_at_before,
            }),
          },
        }
      : {}),
  };

  const page = (props.body.page && props.body.page > 0
    ? props.body.page
    : 1) satisfies number as number;
  const limit = (props.body.limit && props.body.limit > 0
    ? props.body.limit
    : 100) satisfies number as number;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "quantity",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const sortBy =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      shopping_mall_cart_id: item.shopping_mall_cart_id,
      shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
      quantity: item.quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
