import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
    ...(props.body.rating !== undefined && { rating: props.body.rating }),
    ...(props.body.customerId !== undefined && {
      shopping_customer_id: props.body.customerId,
    }),
    ...(props.body.startDate !== undefined && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.search !== undefined && {
      content: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  if (props.body.productId !== undefined) {
    const matchingOrderItems =
      await MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: {
          deleted_at: null,
          product_snapshot: {
            contains: props.body.productId,
          },
        },
        select: { id: true },
      });
    const orderItemIds = matchingOrderItems.map((item) => item.id);
    whereInput.shopping_order_item_id = { in: orderItemIds };
  }
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
