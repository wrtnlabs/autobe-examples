import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { IPageIShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewAbuseReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminReviewsReviewIdAbuseReports(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAbuseReport.IRequest;
}): Promise<IPageIShoppingReviewAbuseReport.ISummary> {
  const { reviewId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with type safety
  const where: Record<string, any> = {
    shopping_review_id: reviewId,
    deleted_at: null,
    ...(body.state !== undefined && { state: body.state }),
    ...(body.type !== undefined && { report_type: body.type }),
    ...(body.reporter_customer_id !== undefined && {
      reporter_customer_id: body.reporter_customer_id,
    }),
    // created_from/created_to safely combine on created_at
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    // search (partial, over report_type or comment)
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        OR: [
          { report_type: { contains: body.search } },
          { comment: { contains: body.search } },
        ],
      }),
  };

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_review_abuse_reports.count({ where }),
    MyGlobal.prisma.shopping_review_abuse_reports.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_review_id: row.shopping_review_id,
      reporter_customer_id: row.reporter_customer_id,
      report_type: row.report_type,
      comment: row.comment ?? null,
      state: row.state,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
