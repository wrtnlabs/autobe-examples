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
  const { customer, body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = 20;
  const skip = page * limit;

  // Concurrent queries for wishlists and total count
  const [wishlists, totalRecords] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: totalPages,
    },
    data: wishlists,
  };
}
