import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCart";
import { IPageIShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminCarts(props: {
  admin: AdminPayload;
  body: IShoppingCart.IRequest;
}): Promise<IPageIShoppingCart.ISummary> {
  // Normalize pagination request
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  // Clean filter object for where-clause construction
  const where: Record<string, any> = {};
  if (
    props.body.shopping_customer_id !== undefined &&
    props.body.shopping_customer_id !== null
  ) {
    where.shopping_customer_id = props.body.shopping_customer_id;
  }
  if (
    props.body.created_from !== undefined &&
    props.body.created_from !== null
  ) {
    where.created_at = { ...where.created_at, gte: props.body.created_from };
  }
  if (props.body.created_to !== undefined && props.body.created_to !== null) {
    where.created_at = { ...where.created_at, lte: props.body.created_to };
  }
  if (
    props.body.updated_from !== undefined &&
    props.body.updated_from !== null
  ) {
    where.updated_at = { ...where.updated_at, gte: props.body.updated_from };
  }
  if (props.body.updated_to !== undefined && props.body.updated_to !== null) {
    where.updated_at = { ...where.updated_at, lte: props.body.updated_to };
  }

  // Pick sort column/order, default to created_at/desc
  const sort_by =
    props.body.sort_by === "updated_at" ? "updated_at" : "created_at";
  const sort_order = props.body.sort_order === "asc" ? "asc" : "desc";

  // Query carts and total records
  const [carts, total] = await Promise.all([
    MyGlobal.prisma.shopping_carts.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip: offset,
      take: limit,
      include: {
        shopping_cart_items: {
          include: {
            sku: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_carts.count({ where }),
  ]);

  // Map to DTO
  const data = carts.map((cart) => ({
    id: cart.id,
    shopping_customer_id: cart.shopping_customer_id,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    items: (cart.shopping_cart_items ?? []).map((item) => ({
      id: item.id,
      sku: {
        id: item.sku.id,
        sku_code: item.sku.sku_code,
        price: item.sku.price,
        is_active: item.sku.is_active,
        status: item.sku.status,
      },
      quantity: item.quantity,
      added_at: toISOStringSafe(item.added_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  }));

  // Pagination info
  const pagination = {
    current: page satisfies number as number,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return { pagination, data };
}
