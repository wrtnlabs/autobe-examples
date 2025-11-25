import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";

export async function getShoppingMallReviewsReviewIdSellerResponse(props: {
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSellerResponse> {
  const sellerResponse =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.findFirst({
      where: {
        shopping_mall_review_id: props.reviewId,
        status: "approved",
        deleted_at: null,
      },
    });

  if (!sellerResponse) {
    throw new HttpException("Seller response not found for this review", 404);
  }

  return {
    id: sellerResponse.id,
    shopping_mall_review_id: sellerResponse.shopping_mall_review_id,
    shopping_mall_seller_id: sellerResponse.shopping_mall_seller_id,
    response_body: sellerResponse.response_body,
    status: sellerResponse.status,
    created_at: toISOStringSafe(sellerResponse.created_at),
    updated_at: toISOStringSafe(sellerResponse.updated_at),
    deleted_at: sellerResponse.deleted_at
      ? toISOStringSafe(sellerResponse.deleted_at)
      : undefined,
  };
}
