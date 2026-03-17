import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      rating: true,
      content: true,
      deleted_at: true,
    },
  });
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Deleted reviews are not editable", 403);
  }
  if (
    props.body.rating !== undefined &&
    (props.body.rating < 1 || props.body.rating > 5)
  ) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const now = toISOStringSafe(new globalThis.Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_review_snapshots.create({
      data: {
        id: v4(),
        review: {
          connect: {
            id: review.id,
          },
        },
        change_type: "edit",
        change_reason: null,
        created_at: now,
      },
    });
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        ...(props.body.rating !== undefined
          ? { rating: props.body.rating }
          : {}),
        ...(props.body.content !== undefined
          ? { content: props.body.content }
          : {}),
        updated_at: now,
      },
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    },
  );
  return await ShoppingMallReviewTransformer.transform(updated);
}
