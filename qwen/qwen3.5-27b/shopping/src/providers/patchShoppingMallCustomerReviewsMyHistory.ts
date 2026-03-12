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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviewsMyHistory(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    shopping_customer_id: props.customer.id,
    deleted_at: null,
  };
  if (props.body.rating !== undefined) {
    whereInput.rating = props.body.rating;
  }
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    whereInput.created_at = {};
    if (props.body.startDate !== undefined) {
      (whereInput.created_at as Prisma.DateTimeFilter).gte = new Date(
        props.body.startDate,
      );
    }
    if (props.body.endDate !== undefined) {
      (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
        props.body.endDate,
      );
    }
  }
  if (props.body.search !== undefined) {
    whereInput.content = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.productId !== undefined) {
    whereInput.shopping_order_item_id = {
      in: (
        await MyGlobal.prisma.shopping_mall_order_items.findMany({
          where: {
            product_snapshot: {
              contains: props.body.productId,
            },
          },
          select: { id: true },
        })
      ).map((item) => item.id),
    };
  }
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  } satisfies Prisma.shopping_mall_reviewsFindManyArgs);
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  } satisfies Prisma.shopping_mall_reviewsCountArgs);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallReview.ISummary;
}
