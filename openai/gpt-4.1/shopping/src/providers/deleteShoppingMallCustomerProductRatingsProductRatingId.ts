import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerProductRatingsProductRatingId(props: {
  customer: CustomerPayload;
  productRatingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Attempt to find the rating, ensure not already deleted
  const rating = await MyGlobal.prisma.shopping_mall_product_ratings.findUnique(
    {
      where: { id: props.productRatingId },
    },
  );

  if (!rating || rating.deleted_at !== null) {
    throw new HttpException("Product rating not found", 404);
  }

  if (rating.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to delete this product rating",
      403,
    );
  }

  // Set deleted_at (must be ISO string)
  await MyGlobal.prisma.shopping_mall_product_ratings.update({
    where: { id: props.productRatingId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // No return (void)
}
