import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import { IPageIShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewModeration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminReviewsReviewIdModerations(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewModeration.IRequest;
}): Promise<IPageIShoppingReviewModeration.ISummary> {
  const { reviewId, body } = props;

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Filtering
  const where = {
    shopping_review_id: reviewId,
    ...(body.moderator_admin_id && {
      moderator_admin_id: body.moderator_admin_id,
    }),
    ...(body.action && { action: body.action }),
    ...(body.date_from || body.date_to
      ? {
          created_at: {
            ...(body.date_from && { gte: body.date_from }),
            ...(body.date_to && { lte: body.date_to }),
          },
        }
      : {}),
  };

  // Sorting
  const sortField = body.sort_by ?? "created_at";
  const sortDirection = body.sort_direction ?? "desc";

  // Query moderation logs and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_review_moderations.findMany({
      where: where,
      orderBy: { [sortField]: sortDirection },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_review_moderations.count({ where: where }),
  ]);

  // Convert DB results to DTOs
  const data = rows.map((row) => ({
    id: row.id,
    shopping_review_id: row.shopping_review_id,
    moderator_admin_id: row.moderator_admin_id,
    action: row.action,
    reason: row.reason ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
