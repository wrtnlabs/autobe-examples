import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSellerResponse> {
  const response =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.findUnique({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      include: {
        review: {
          include: {
            sale: true,
          },
        },
      },
    });

  if (!response) {
    throw new HttpException("Seller response not found", 404);
  }

  if (response.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (response.review.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const deleted =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.delete({
      where: {
        id: response.id,
      },
    });

  return {
    id: deleted.id,
    shopping_mall_review_id: deleted.shopping_mall_review_id,
    shopping_mall_seller_id: deleted.shopping_mall_seller_id,
    response_body: deleted.response_body,
    status: deleted.status,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
