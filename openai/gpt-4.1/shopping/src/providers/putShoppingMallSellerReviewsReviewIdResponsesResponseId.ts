import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewResponse";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerReviewsReviewIdResponsesResponseId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewResponse.IUpdate;
}): Promise<IShoppingMallReviewResponse> {
  const response =
    await MyGlobal.prisma.shopping_mall_review_responses.findFirst({
      where: {
        id: props.responseId,
        shopping_mall_review_id: props.reviewId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  if (!response) {
    throw new HttpException(
      "Review response not found or not accessible by seller.",
      404,
    );
  }

  const updateData = {
    ...(props.body.body !== undefined && { body: props.body.body }),
    ...(props.body.moderation_status !== undefined && {
      moderation_status: props.body.moderation_status,
    }),
    ...(props.body.moderation_reason !== undefined && {
      moderation_reason: props.body.moderation_reason,
    }),
    ...(props.body.withdrawn_at !== undefined && {
      withdrawn_at: props.body.withdrawn_at,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.shopping_mall_review_responses.update({
    where: { id: props.responseId },
    data: updateData,
  });

  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: response.shopping_mall_review_id },
  });
  if (!review) {
    throw new HttpException("Associated review not found.", 500);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: response.shopping_mall_seller_id },
  });
  if (!seller) {
    throw new HttpException("Seller not found.", 500);
  }

  return {
    id: updated.id,
    body: updated.body,
    moderation_status: updated.moderation_status,
    moderation_reason: updated.moderation_reason ?? null,
    withdrawn_at: updated.withdrawn_at
      ? toISOStringSafe(updated.withdrawn_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    review: {
      id: review.id,
      title: review.title,
      is_draft: review.is_draft,
      moderation_status: review.moderation_status,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      customer: {
        id: review.shopping_mall_customer_id,
        name: "",
      },
      product: {
        id: review.shopping_mall_product_id,
        title: "",
        default_price: 0,
        business_status: "",
        seller: {
          id: seller.id,
          business_name: seller.business_name,
        },
        categories: [],
        created_at: toISOStringSafe(review.created_at),
      },
      productSku: {
        id: review.shopping_mall_product_sku_id,
        code: "",
        product_title: "",
        option_summary: "",
        in_stock: true,
      },
      productRating: {
        id: review.shopping_mall_product_rating_id,
        value: 0,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        customer: {
          id: review.shopping_mall_customer_id,
          name: "",
        },
        product: {
          id: review.shopping_mall_product_id,
          title: "",
          default_price: 0,
          business_status: "",
          seller: {
            id: seller.id,
            business_name: seller.business_name,
          },
          categories: [],
          created_at: toISOStringSafe(review.created_at),
        },
        productSku: {
          id: review.shopping_mall_product_sku_id,
          code: "",
          product_title: "",
          option_summary: "",
          in_stock: true,
        },
      },
      orderItem: { id: review.shopping_mall_order_item_id },
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
  };
}
