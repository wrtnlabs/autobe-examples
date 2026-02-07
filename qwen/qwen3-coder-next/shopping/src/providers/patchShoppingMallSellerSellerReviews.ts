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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerReviews(props: {
  seller: SellerPayload;
  body: IShoppingMallReview.IManageRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const skip = 0;
  // Filter by seller's products
  const whereConditions: Prisma.shopping_mall_reviewsWhereInput = {
    orderItem: {
      product: {
        seller: {
          id: props.seller.id,
        },
      },
    },
  };
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereConditions,
    skip,
    take: 20,
    orderBy: {
      id: "desc" as const,
    },
    select: {
      id: true,
      rating: true,
      content: true,
      orderItem: {
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true,
              seller: {
                select: {
                  id: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereConditions,
  });
  const reviews = data.map((review) => ({
    id: review.id as string & tags.Format<"uuid">,
    rating: review.rating,
    content: review.content ?? undefined,
    product: {
      id: review.orderItem.product.id as string & tags.Format<"uuid">,
      name: review.orderItem.product.name,
    },
    customer: {
      id: review.orderItem.customer.id as string & tags.Format<"uuid">,
      name: review.orderItem.customer.name,
    },
  }));
  return {
    data: reviews,
    pagination: {
      current: 1,
      limit: 20,
      records: total,
      pages: Math.ceil(total / 20),
    },
  };
}
