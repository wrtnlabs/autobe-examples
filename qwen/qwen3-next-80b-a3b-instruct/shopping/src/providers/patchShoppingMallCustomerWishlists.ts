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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const {
    page = 1,
    limit = 10,
    orderBy = "updated_at",
    order = "desc",
  } = props.body;

  const skip = (page - 1) * limit;

  const [wishlists, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      orderBy: {
        [orderBy]: order,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IShoppingMallWishlist.ISummary[] = wishlists.map((wishlist) => ({
    id: wishlist.id,
    name: wishlist.name,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
