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

export async function patchShoppingMallAdminProductReviewsProductReviewIdReviewModerations(props: {
  admin: AdminPayload;
  productReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.IRequest;
}): Promise<IPageIShoppingMallReviewModeration> {
  const page = props.body.pagination.page ?? 1;
  const pageSize = props.body.pagination.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const where = {
    deleted_at: null as null,
    shopping_mall_product_review_id: props.productReviewId,
    ...(props.body.filter.shopping_mall_admin_id !== undefined &&
      props.body.filter.shopping_mall_admin_id !== null && {
        shopping_mall_admin_id: props.body.filter.shopping_mall_admin_id,
      }),
    ...(props.body.filter.action !== undefined &&
      props.body.filter.action !== null && {
        action: props.body.filter.action,
      }),
  };

  const orderBy = props.body.sort.map((sortItem) => {
    const dir = sortItem.direction === "asc" ? "asc" : "desc";
    return { [sortItem.property]: dir };
  });

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_moderations.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.shopping_mall_review_moderations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: items.map((item) => ({
      id: item.id,
      shopping_mall_product_review_id: item.shopping_mall_product_review_id,
      shopping_mall_admin_id: item.shopping_mall_admin_id,
      action: item.action,
      comment: item.comment ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
