import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
}): Promise<IPageIShoppingMallReviewImage> {
  const { reviewId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const sort = body.sort ?? "display_order";

  const skip = (page - 1) * limit;

  const [images, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_images.findMany({
      where: {
        shopping_mall_review_id: reviewId,
      },
      orderBy:
        sort === "created_at"
          ? { created_at: "asc" }
          : sort === "created_at_desc"
            ? { created_at: "desc" }
            : { display_order: "asc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_review_images.count({
      where: {
        shopping_mall_review_id: reviewId,
      },
    }),
  ]);

  const data: IShoppingMallReviewImage[] = images.map((image) => ({
    id: image.id as string & tags.Format<"uuid">,
    shopping_mall_review_id: image.shopping_mall_review_id as string &
      tags.Format<"uuid">,
    image_url: image.image_url,
    display_order: image.display_order,
    created_at: toISOStringSafe(image.created_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data,
  };
}
