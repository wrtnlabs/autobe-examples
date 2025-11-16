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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    customer_id: props.customer.id,
    deleted_at: null as null | undefined,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.search
      ? {
          OR: [
            { name: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const [wishlists, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.order ?? "desc",
      },
      include: {
        customer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: wishlists.map((wishlist) => ({
      id: wishlist.id,
      name: wishlist.name,
      items_count: 0 satisfies number as number,
      is_public: false satisfies boolean as boolean,
      customer: {
        id: wishlist.customer.id,
        email: wishlist.customer.email,
        name: wishlist.customer.name,
        status: "" satisfies string as string,
        created_at: toISOStringSafe(wishlist.customer.created_at),
        updated_at: wishlist.customer.updated_at
          ? toISOStringSafe(wishlist.customer.updated_at)
          : undefined,
      },
      created_at: toISOStringSafe(wishlist.created_at),
    })),
  };
}
