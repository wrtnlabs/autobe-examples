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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;

  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be greater than or equal to 1", 400);
  }

  const skip = (page - 1) * limit;

  const createdAtFilter =
    (props.body.created_since !== null &&
      props.body.created_since !== undefined) ||
    (props.body.created_until !== null &&
      props.body.created_until !== undefined)
      ? {
          ...(props.body.created_since !== null &&
          props.body.created_since !== undefined
            ? { gte: toISOStringSafe(props.body.created_since) }
            : {}),
          ...(props.body.created_until !== null &&
          props.body.created_until !== undefined
            ? { lte: toISOStringSafe(props.body.created_until) }
            : {}),
        }
      : undefined;

  const where = {
    ...(props.body.search_term
      ? { email: { contains: props.body.search_term } }
      : {}),
    ...(props.body.email_filter ? { email: props.body.email_filter } : {}),
    ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
  };

  const orderBy:
    | Prisma.shopping_mall_sellersOrderByWithRelationInput
    | undefined =
    props.body.sort_by &&
    (props.body.sort_order === "asc" || props.body.sort_order === "desc")
      ? ({
          [props.body.sort_by]: props.body.sort_order,
        } as Prisma.shopping_mall_sellersOrderByWithRelationInput)
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: { id: true, email: true },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  const summaries = data.map((seller) => ({
    id: seller.id,
    name: seller.email,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / (limit satisfies number as number)),
    },
    data: summaries,
  };
}
