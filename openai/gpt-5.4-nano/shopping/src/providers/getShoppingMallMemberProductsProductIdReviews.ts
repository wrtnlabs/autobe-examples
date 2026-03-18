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

export async function getShoppingMallMemberProductsProductIdReviews(props: {
  member: MemberPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page: number = 1;
  const limit: number = 20;
  const skip: number = (page - 1) * limit;
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (product === null) {
    const records = 0;
    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(records / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data: [],
    };
  }
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: { shopping_mall_product_id: props.productId },
    orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
    skip,
    take: limit,
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
  });
  const records = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: { shopping_mall_product_id: props.productId },
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(records / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: reviews.map(
      (r) =>
        ({
          id: r.id,
          shoppingMallProductId: r.shopping_mall_product_id,
          shoppingMallOrderItemId: r.shopping_mall_order_item_id,
          shoppingMallCustomerId: r.shopping_mall_customer_id,
          rating: r.rating,
          body: r.body === null ? null : r.body,
          isPublic: r.is_public,
          deletedAt: r.deleted_at === null ? null : r.deleted_at.toISOString(),
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }) satisfies IShoppingMallReview.ISummary,
    ),
  };
}
