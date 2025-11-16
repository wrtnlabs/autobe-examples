import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCarts(props: {
  admin: AdminPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const {
    customer_id,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  const actualPage = page ?? 1;
  const actualLimit = limit ?? 100;
  const skip = (actualPage - 1) * actualLimit;
  const orderByField = sort_by ?? "created_at";
  const orderByDirection = sort_order ?? "desc";

  // Build the 'where' object step by step to avoid referencing itself
  const where: Record<string, unknown> = {};
  if (customer_id) {
    where.customer_id = customer_id;
  }
  if (created_from || created_to) {
    where.created_at = {};
    if (created_from) (where.created_at as any).gte = created_from;
    if (created_to) (where.created_at as any).lte = created_to;
    if (Object.keys(where.created_at as any).length === 0)
      delete where.created_at;
  }
  if (updated_from || updated_to) {
    where.updated_at = {};
    if (updated_from) (where.updated_at as any).gte = updated_from;
    if (updated_to) (where.updated_at as any).lte = updated_to;
    if (Object.keys(where.updated_at as any).length === 0)
      delete where.updated_at;
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: actualLimit,
      include: {
        customer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  return {
    pagination: {
      current: actualPage,
      limit: actualLimit,
      records: total,
      pages: Math.ceil(total / actualLimit),
    },
    data: records.map((cart) => ({
      id: cart.id,
      customer: {
        id: cart.customer.id,
        name: cart.customer.name,
      },
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
    })),
  };
}
