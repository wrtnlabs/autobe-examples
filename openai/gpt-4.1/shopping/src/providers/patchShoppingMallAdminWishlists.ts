import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminWishlists(props: {
  admin: AdminPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (props.body.customer_id) {
    where.customer_id = props.body.customer_id;
  }
  if (props.body.created_from || props.body.created_to) {
    where.created_at = {};
    if (props.body.created_from) {
      (where.created_at as any)["gte"] = props.body.created_from;
    }
    if (props.body.created_to) {
      (where.created_at as any)["lte"] = props.body.created_to;
    }
  }
  const orderBy =
    props.body.sort_by && props.body.sort_order
      ? { [props.body.sort_by]: props.body.sort_order as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { customer: true },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((wishlist) => ({
      id: wishlist.id,
      customer: { id: wishlist.customer.id, name: wishlist.customer.name },
      created_at: toISOStringSafe(wishlist.created_at),
    })),
  };
}
