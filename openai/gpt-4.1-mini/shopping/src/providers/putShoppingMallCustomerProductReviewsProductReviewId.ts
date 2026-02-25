import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductReviewTransformer } from "../transformers/ShoppingMallProductReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProductReviewsProductReviewId(props: {
  customer: CustomerPayload;
  productReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IUpdate;
}): Promise<IShoppingMallProductReview> {
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.productReviewId },
      select: { shopping_mall_customer_id: true },
    },
  );
  if (review === null) {
    throw new HttpException("Review Not Found", 404);
  }
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.shopping_mall_product_reviews.update({
    where: { id: props.productReviewId },
    data: {
      rating: props.body.rating,
      body: props.body.body === undefined ? null : props.body.body,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUniqueOrThrow({
      where: { id: props.productReviewId },
      ...ShoppingMallProductReviewTransformer.select(),
    });
  return await ShoppingMallProductReviewTransformer.transform(updated);
}
