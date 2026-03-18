import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const includeDeleted = props.body.includeDeleted ?? false;
  const sort = props.body.sort ?? "newest";
  const prisma = MyGlobal.prisma;
  const where = {
    deleted_at: includeDeleted ? undefined : null,
  };
  const orderBy = (() => {
    switch (sort) {
      case "oldest":
        return { created_at: "asc" as const };
      case "newest":
      default:
        return { created_at: "desc" as const };
    }
  })();
  const total = await prisma.shopping_mall_reviews.count({ where });
  const items = await prisma.shopping_mall_reviews.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shopping_mall_order_item_id: true,
      shopping_mall_customer_id: true,
    },
  });
  const data = items.map((x) => {
    const created_at =
      x.created_at === null ? null : toISOStringSafe(x.created_at);
    const updated_at =
      x.updated_at === null ? null : toISOStringSafe(x.updated_at);
    const deleted_at =
      x.deleted_at === null ? null : toISOStringSafe(x.deleted_at);
    return {
      id: x.id,
      shopping_mall_id: x.shopping_mall_order_item_id,
      author_id: x.shopping_mall_customer_id,
      rating: x.rating,
      comment: x.body,
      created_at,
      updated_at,
      deleted_at,
    };
  });
  const current = page satisfies number;
  const records = limit satisfies number;
  const pages = Math.max(1, Math.ceil(total / limit)) satisfies number;
  return {
    pagination: {
      current,
      records,
      pages,
    },
    data,
  } as unknown as IPageIShoppingMallReview.ISummary;
}
