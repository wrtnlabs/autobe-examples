import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatusHistory";
import { IPageIShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReviewIdStatusHistories(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewStatusHistory.IRequest;
}): Promise<IPageIShoppingMallReviewStatusHistory.ISummary> {
  const {
    status,
    actor_type,
    actor_id,
    start_at,
    end_at,
    search,
    sort_by = "created_at",
    order = "desc",
    page,
    limit,
  } = props.body;

  // Build actor ID filter based on actor_type only
  let actorIdFilters = {};
  if (actor_type === "customer" && actor_id !== undefined) {
    actorIdFilters = { actor_customer_id: actor_id };
  } else if (actor_type === "seller" && actor_id !== undefined) {
    actorIdFilters = { actor_seller_id: actor_id };
  } else if (actor_type === "admin" && actor_id !== undefined) {
    actorIdFilters = { actor_admin_id: actor_id };
  }

  // Build date filter
  let dateRangeFilter = {};
  if (start_at !== undefined || end_at !== undefined) {
    dateRangeFilter = {
      created_at: {
        ...(start_at !== undefined ? { gte: start_at } : {}),
        ...(end_at !== undefined ? { lte: end_at } : {}),
      },
    };
  }

  // Build search filter
  let searchFilter = undefined;
  if (search !== undefined && search !== "") {
    searchFilter = {
      OR: [{ reason: { contains: search } }],
    };
  }

  // Merge all filters
  const filters = {
    shopping_mall_review_id: props.reviewId,
    ...(status !== undefined ? { status } : {}),
    ...actorIdFilters,
    ...dateRangeFilter,
    ...(searchFilter !== undefined ? searchFilter : {}),
  };

  const skip = (page - 1) * limit;
  const take = limit;
  const orderBy = [{ [sort_by]: order }];

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_status_histories.findMany({
      where: filters,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_review_status_histories.count({
      where: filters,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_review_id: row.shopping_mall_review_id,
    actor_customer_id:
      row.actor_customer_id === null ? undefined : row.actor_customer_id,
    actor_seller_id:
      row.actor_seller_id === null ? undefined : row.actor_seller_id,
    actor_admin_id:
      row.actor_admin_id === null ? undefined : row.actor_admin_id,
    actor_session_id:
      row.actor_session_id === null ? undefined : row.actor_session_id,
    status: row.status,
    reason: row.reason === null ? undefined : row.reason,
    created_at: toISOStringSafe(row.created_at),
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
