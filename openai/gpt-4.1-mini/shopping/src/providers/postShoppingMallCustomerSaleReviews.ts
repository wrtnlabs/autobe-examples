import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
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

export async function postShoppingMallCustomerSaleReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleReview.ICreate;
}): Promise<IShoppingMallSaleReview> {
  const rating: number = (props.body as any).rating;
  if (rating < 1 || rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const now = new Date();
  const review: IShoppingMallSaleReview = {
    id: v4(),
    sale_id: (props.body as any).sale_id ?? "",
    customer_id: props.customer.id,
    rating: rating,
    comment: (props.body as any).comment ?? null,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
  };
  return review;
}
