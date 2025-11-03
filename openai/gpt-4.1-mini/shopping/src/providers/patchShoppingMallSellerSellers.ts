import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellers(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const { body } = props;

  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.store_name !== undefined &&
      body.store_name !== null && {
        store_name: { contains: body.store_name },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
  };

  const orderBy: { store_name?: "asc" | "desc"; created_at?: "asc" | "desc" } =
    body.sort_by === "store_name"
      ? { store_name: body.sort_order === "asc" ? "asc" : "desc" }
      : { created_at: body.sort_order === "asc" ? "asc" : "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((seller) => ({
      id: seller.id,
      email: seller.email,
      store_name: seller.store_name,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at:
        seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
      is_active: seller.deleted_at === null,
      profile: undefined,
    })),
  };
}
