import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.orderId !== undefined && {
      shopping_mall_order_id: props.body.orderId,
    }),
    ...(props.body.orderItemId !== undefined && {
      shopping_mall_order_item_id: props.body.orderItemId,
    }),
    ...(props.body.rating !== undefined && {
      rating: props.body.rating,
    }),
    ...(props.body.search !== undefined && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.deleted !== undefined &&
      (props.body.deleted === true
        ? {
            deleted_at: {
              not: null,
            },
          }
        : {
            deleted_at: null,
          })),
    ...((props.body.createdFrom !== undefined ||
      props.body.createdTo !== undefined) && {
      created_at: {
        ...(props.body.createdFrom !== undefined && {
          gte: props.body.createdFrom,
        }),
        ...(props.body.createdTo !== undefined && {
          lte: props.body.createdTo,
        }),
      },
    }),
    ...((props.body.updatedFrom !== undefined ||
      props.body.updatedTo !== undefined) && {
      updated_at: {
        ...(props.body.updatedFrom !== undefined && {
          gte: props.body.updatedFrom,
        }),
        ...(props.body.updatedTo !== undefined && {
          lte: props.body.updatedTo,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const orderBy =
    props.body.sort === "created_at"
      ? ({
          created_at: "asc",
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
      : props.body.sort === "updated_at"
        ? ({
            updated_at: "asc",
          } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
        : props.body.sort === "rating"
          ? ({
              rating: "asc",
            } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
          : props.body.sort === "-updated_at"
            ? ({
                updated_at: "desc",
              } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
            : props.body.sort === "-rating"
              ? ({
                  rating: "desc",
                } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput)
              : ({
                  created_at: "desc",
                } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput);
  const rows = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
