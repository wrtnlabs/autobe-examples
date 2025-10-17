import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSellerResponses(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerResponse.ICreate;
}): Promise<IShoppingMallSellerResponse> {
  const { seller, body } = props;

  // Fetch the review with product relation to verify seller ownership
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: body.shopping_mall_review_id },
    include: {
      product: true,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Verify the authenticated seller owns the product being reviewed
  if (review.product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only respond to reviews on your own products",
      403,
    );
  }

  // Check if a response already exists for this review
  const existingResponse =
    await MyGlobal.prisma.shopping_mall_seller_responses.findUnique({
      where: { shopping_mall_review_id: body.shopping_mall_review_id },
    });

  if (existingResponse) {
    throw new HttpException(
      "A response already exists for this review. Only one response per review is allowed.",
      409,
    );
  }

  // Create the seller response with pending moderation status
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_seller_responses.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_review_id: body.shopping_mall_review_id,
      shopping_mall_seller_id: seller.id,
      response_text: body.response_text,
      status: "pending_moderation",
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created response matching IShoppingMallSellerResponse
  return {
    id: created.id as string & tags.Format<"uuid">,
    response_text: created.response_text,
  };
}
