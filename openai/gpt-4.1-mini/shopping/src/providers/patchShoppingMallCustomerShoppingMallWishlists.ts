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

export async function patchShoppingMallCustomerShoppingMallWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page satisfies number as number;
  const limit = props.body.limit satisfies number as number;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.shopping_mall_wishlistsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: props.body.include_deleted ? undefined : null,
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
  };

  const [wishlists, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: wishlists.map((item) => ({
      id: item.id,
      shopping_mall_customer_id: item.shopping_mall_customer_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
