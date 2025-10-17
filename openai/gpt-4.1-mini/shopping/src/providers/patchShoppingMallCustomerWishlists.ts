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

  const page = (body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.shopping_mall_customer_id !== undefined &&
    body.shopping_mall_customer_id !== null
      ? { shopping_mall_customer_id: body.shopping_mall_customer_id }
      : { shopping_mall_customer_id: customer.id }),
  };

  const [wishlists, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: wishlists.map((record) => ({
      id: record.id,
      shopping_mall_customer_id: record.shopping_mall_customer_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
