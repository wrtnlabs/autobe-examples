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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberReviews(props: {
  member: MemberPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const shoppingMallCustomerId =
    props.body.shoppingMallCustomerId ?? props.member.id;
  // Authorization gating: member callers can only view their own reviews.
  if (props.body.shoppingMallCustomerId !== undefined) {
    if (shoppingMallCustomerId !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const where = {
    shopping_mall_customer_id: shoppingMallCustomerId,
    ...(props.body.shoppingMallProductId !== undefined && {
      shopping_mall_product_id: props.body.shoppingMallProductId,
    }),
    ...(props.body.shoppingMallOrderItemId !== undefined && {
      shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
    }),
    ...(props.body.includeDeleted === undefined ||
    props.body.includeDeleted === false
      ? { deleted_at: null as unknown as Date }
      : {}),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const orderBy =
    props.body.sort === "oldest"
      ? ({
          updated_at: "asc" as const,
          created_at: "asc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
      : ({
          updated_at: "desc" as const,
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput);
  const skip = (page - 1) * limit;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_customer_id: true,
        rating: true,
        body: true,
        is_public: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map(
      (r) =>
        ({
          id: r.id,
          shoppingMallProductId: r.shopping_mall_product_id,
          shoppingMallOrderItemId: r.shopping_mall_order_item_id,
          shoppingMallCustomerId: r.shopping_mall_customer_id,
          rating: r.rating,
          body: r.body ?? null,
          isPublic: r.is_public,
          deletedAt: r.deleted_at === null ? null : r.deleted_at.toISOString(),
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }) satisfies IShoppingMallReview.ISummary,
    ),
  };
}
