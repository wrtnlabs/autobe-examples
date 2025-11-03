import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { IPageIShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerReviewsReviewIdAttachments(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAttachment.IRequest;
}): Promise<IPageIShoppingReviewAttachment> {
  // Step 1: Ensure the review exists and is owned by the requesting customer
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not the owner of this review", 403);
  }
  // Step 2: Build filters for shopping_review_attachments
  const {
    file_type,
    upload_date_from,
    upload_date_to,
    include_deleted,
    page,
    limit,
  } = props.body;
  const realPage = typeof page === "number" && page >= 1 ? page : 1;
  const realLimit =
    typeof limit === "number" && limit >= 1 && limit <= 100 ? limit : 20;
  const where = {
    shopping_review_id: props.reviewId,
    ...(file_type !== undefined && { file_type }),
    ...((upload_date_from !== undefined || upload_date_to !== undefined) && {
      created_at: {
        ...(upload_date_from !== undefined && { gte: upload_date_from }),
        ...(upload_date_to !== undefined && { lte: upload_date_to }),
      },
    }),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_review_attachments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (realPage - 1) * realLimit,
      take: realLimit,
      select: {
        id: true,
        shopping_review_id: true,
        file_uri: true,
        file_type: true,
        file_size: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_review_attachments.count({ where }),
  ]);

  // Step 3: Map results to API structure
  const data = rows.map((row) => ({
    id: row.id,
    shopping_review_id: row.shopping_review_id,
    file_uri: row.file_uri,
    file_type: row.file_type,
    file_size: row.file_size,
    created_at: toISOStringSafe(row.created_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  const pagination: IPage.IPagination = {
    current: Number(realPage),
    limit: Number(realLimit),
    records: total,
    pages: Math.ceil(total / Number(realLimit)),
  };

  return { pagination, data };
}
