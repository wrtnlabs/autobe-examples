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
  const includeDeleted = props.body.includeDeleted ?? false;
  const sort = props.body.sort ?? "newest";
  const where = {
    ...(includeDeleted
      ? {}
      : ({
          deleted_at: null,
        } satisfies Prisma.shopping_mall_reviewsWhereInput)),
    ...(props.body.shoppingMallProductId
      ? ({
          shopping_mall_product_id: props.body.shoppingMallProductId,
        } satisfies Prisma.shopping_mall_reviewsWhereInput)
      : {}),
    ...(props.body.shoppingMallOrderItemId
      ? ({
          shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
        } satisfies Prisma.shopping_mall_reviewsWhereInput)
      : {}),
    ...(props.body.shoppingMallCustomerId
      ? ({
          shopping_mall_customer_id: props.body.shoppingMallCustomerId,
        } satisfies Prisma.shopping_mall_reviewsWhereInput)
      : ({
          shopping_mall_customer_id: props.member.id,
        } satisfies Prisma.shopping_mall_reviewsWhereInput)),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  if (
    props.body.shoppingMallCustomerId !== undefined &&
    props.body.shoppingMallCustomerId !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const orderBy =
    sort === "newest"
      ? ([
          { updated_at: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput[])
      : ([
          { updated_at: "asc" },
          { created_at: "asc" },
        ] satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput[]);
  const [items, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      skip: (page - 1) * limit,
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
  const data = await ArrayUtil.asyncMap(items, async (r) => {
    const id = typia.assert<string & tags.Format<"uuid">>(r.id);
    const shoppingMallProductId = typia.assert<string & tags.Format<"uuid">>(
      r.shopping_mall_product_id,
    );
    const shoppingMallOrderItemId = typia.assert<string & tags.Format<"uuid">>(
      r.shopping_mall_order_item_id,
    );
    const shoppingMallCustomerId = typia.assert<string & tags.Format<"uuid">>(
      r.shopping_mall_customer_id,
    );
    return {
      id,
      shoppingMallProductId,
      shoppingMallOrderItemId,
      shoppingMallCustomerId,
      rating: r.rating,
      body: r.body === null ? null : r.body,
      isPublic: r.is_public,
      deletedAt: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
    } satisfies IShoppingMallReview.ISummary;
  });
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
