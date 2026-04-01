import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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

export async function getShoppingMallCustomerProductsProductIdRatings(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductRating> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const aggregate = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
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
  return {
    averageRating: aggregate._avg.rating as
      | (number & tags.Minimum<1> & tags.Maximum<5>)
      | null,
    totalReviews: aggregate._count.id as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
