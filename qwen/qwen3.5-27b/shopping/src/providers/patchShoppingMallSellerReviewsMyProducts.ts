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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerReviewsMyProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const created_at: Prisma.DateTimeFilter = {};
  if (props.body.startDate !== undefined) {
    created_at.gte = new Date(props.body.startDate);
  }
  if (props.body.endDate !== undefined) {
    created_at.lte = new Date(props.body.endDate);
  }
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
    orderItem: {
      shopping_mall_seller_id: props.seller.id,
      status: {
        notIn: ["cancelled", "refunded"],
      },
    },
  };
  if (Object.keys(created_at).length > 0) {
    whereInput.created_at = created_at;
  }
  if (props.body.rating !== undefined) {
    whereInput.rating = props.body.rating;
  }
  if (props.body.customerId !== undefined) {
    whereInput.shopping_customer_id = props.body.customerId;
  }
  if (props.body.search !== undefined) {
    whereInput.content = {
      contains: props.body.search,
    };
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
