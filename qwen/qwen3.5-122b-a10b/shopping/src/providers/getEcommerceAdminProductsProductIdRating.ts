import { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminProductsProductIdRating(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductRating> {
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const aggregate = await MyGlobal.prisma.ecommerce_reviews.aggregate({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });
  const reviewCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    aggregate._count.id;
  const averageRatingValue = aggregate._avg.rating
    ? Math.round(aggregate._avg.rating * 100) / 100
    : null;
  return {
    average_rating: averageRatingValue,
    review_count: reviewCount,
  } satisfies IEcommerceProductRating;
}
