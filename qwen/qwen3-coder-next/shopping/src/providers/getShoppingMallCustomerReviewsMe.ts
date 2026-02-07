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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerReviewsMe(props: {
  customer: CustomerPayload;
}): Promise<IPageIShoppingMallReview> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      customer_id: props.customer.id,
    },
    skip,
    take: limit,
    orderBy: { id: "desc" },
    select: {
      id: true,
      customer_id: true,
      order_item_id: true,
      rating: true,
      content: true,
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
      orderItem: {
        select: {
          id: true,
          product_name: true,
          product_image_url: true,
          productVariant: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: {
      customer_id: props.customer.id,
    },
  });
  return {
    data: data.map((review) => ({
      id: review.id as string & tags.Format<"uuid">,
      customer_id: review.customer_id as string & tags.Format<"uuid">,
      order_item_id: review.order_item_id as string & tags.Format<"uuid">,
      rating: review.rating,
      content: review.content ?? null,
      created_at: toISOStringSafe(new Date()),
      customer: review.customer
        ? {
            id: review.customer.id as string & tags.Format<"uuid">,
            name: "",
            email: review.customer.email as string & tags.Format<"email">,
          }
        : null,
      order_item: review.orderItem
        ? {
            id: review.orderItem.id as string & tags.Format<"uuid">,
            product_name: review.orderItem.product_name,
            product_image_url: review.orderItem.product_image_url,
            product_variant: review.orderItem.productVariant
              ? {
                  id: review.orderItem.productVariant.id as string &
                    tags.Format<"uuid">,
                  options: null,
                }
              : null,
          }
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
