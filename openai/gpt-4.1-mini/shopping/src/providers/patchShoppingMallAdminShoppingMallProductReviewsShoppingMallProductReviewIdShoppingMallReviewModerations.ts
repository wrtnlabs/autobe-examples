import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import { IPageIShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModeration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewIdShoppingMallReviewModerations(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.IRequest;
}): Promise<IPageIShoppingMallReviewModeration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_review_moderationsWhereInput = {
    shopping_mall_product_review_id: props.shoppingMallProductReviewId,
    ...(props.body.filter_moderation_action
      ? { action: props.body.filter_moderation_action }
      : {}),
    deleted_at: null,
  };

  const orderBy: Prisma.shopping_mall_review_moderationsOrderByWithRelationInput =
    {};
  if (props.body.sort_by) {
    const order = props.body.order === "asc" ? "asc" : "desc";
    // Use type assertion to key to avoid implicit any error
    const sortByKey = props.body
      .sort_by as keyof Prisma.shopping_mall_review_moderationsOrderByWithRelationInput;
    orderBy[sortByKey] = order;
  } else {
    orderBy.created_at = "desc";
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_moderations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_review_moderations.count({ where }),
  ]);

  return {
    data: data.map((d) => ({
      id: d.id,
      shopping_mall_product_review_id: d.shopping_mall_product_review_id,
      shopping_mall_admin_id: d.shopping_mall_admin_id,
      action: d.action,
      comment: d.comment ?? null,
      created_at: toISOStringSafe(d.created_at),
      updated_at: toISOStringSafe(d.updated_at),
      deleted_at: d.deleted_at ? toISOStringSafe(d.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
