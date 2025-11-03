import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationQueue";
import { IPageIShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationQueue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewModerationQueues(props: {
  admin: AdminPayload;
  body: IShoppingMallReviewModerationQueue.IRequest;
}): Promise<IPageIShoppingMallReviewModerationQueue.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  if (page < 1) {
    throw new HttpException("Page must be greater than 0", 400);
  }

  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: { contains: body.status } }),
    ...(body.flagged_reason !== undefined &&
      body.flagged_reason !== null && {
        flagged_reason: { contains: body.flagged_reason },
      }),
    ...(body.moderator_notes !== undefined &&
      body.moderator_notes !== null && {
        moderator_notes: { contains: body.moderator_notes },
      }),
  };

  const sortField = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_moderation_queues.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      include: {
        productReview: {
          select: {
            id: true,
            shopping_mall_product_sku_id: true,
            shopping_mall_customer_id: true,
            shopping_mall_order_id: true,
            rating: true,
            review_body: true,
            moderation_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_review_moderation_queues.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((entry) => ({
      id: entry.id,
      shopping_mall_product_review_id: entry.shopping_mall_product_review_id,
      flagged_reason: entry.flagged_reason,
      moderator_notes: entry.moderator_notes ?? null,
      status: entry.status,
      created_at: toISOStringSafe(entry.created_at),
      updated_at: toISOStringSafe(entry.updated_at),
      deleted_at: entry.deleted_at ? toISOStringSafe(entry.deleted_at) : null,
      productReview: entry.productReview
        ? {
            id: entry.productReview.id,
            shopping_mall_product_sku_id:
              entry.productReview.shopping_mall_product_sku_id,
            shopping_mall_customer_id:
              entry.productReview.shopping_mall_customer_id,
            shopping_mall_order_id: entry.productReview.shopping_mall_order_id,
            rating: entry.productReview.rating,
            review_body: entry.productReview.review_body ?? null,
            moderation_status: entry.productReview.moderation_status,
            created_at: toISOStringSafe(entry.productReview.created_at),
            updated_at: toISOStringSafe(entry.productReview.updated_at),
            deleted_at: entry.productReview.deleted_at
              ? toISOStringSafe(entry.productReview.deleted_at)
              : null,
          }
        : undefined,
    })),
  };
}
