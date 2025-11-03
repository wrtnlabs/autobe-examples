import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerProductReviewsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.id },
      select: { shopping_mall_customer_id: true },
    },
  );

  if (review === null) {
    throw new HttpException("Not Found", 404);
  }

  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own reviews",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_product_reviews.delete({
    where: { id: props.id },
  });
}
