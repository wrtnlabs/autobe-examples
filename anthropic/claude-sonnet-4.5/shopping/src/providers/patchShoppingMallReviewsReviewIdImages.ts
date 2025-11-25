import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { IPageIShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallReviewsReviewIdImages(props: {
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImage.IRequest;
}): Promise<IPageIShoppingMallReviewImage.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "display_order";
  const skip = (page - 1) * limit;

  const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
  const sortDirection = sort.startsWith("-") ? "desc" : "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_images.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
        ...(props.body.search && {
          image_url: { contains: props.body.search },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDirection,
      },
    }),
    MyGlobal.prisma.shopping_mall_review_images.count({
      where: {
        shopping_mall_review_id: props.reviewId,
        ...(props.body.search && {
          image_url: { contains: props.body.search },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((image) => ({
      id: image.id,
      shopping_mall_review_id: image.shopping_mall_review_id,
      image_url: image.image_url,
      thumbnail_url: image.thumbnail_url,
      medium_url: image.medium_url,
      display_order: image.display_order,
      created_at: toISOStringSafe(image.created_at),
    })),
  };
}
