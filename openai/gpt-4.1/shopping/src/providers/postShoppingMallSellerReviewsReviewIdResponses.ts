import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallSellerReviewsReviewIdResponses(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewResponse.ICreate;
}): Promise<IShoppingMallReviewResponse> {
  // Step 1: Fetch the target review (must exist & not withdrawn/deleted)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      withdrawn_at: null,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException(
      "Review not found or already withdrawn/deleted",
      404,
    );
  }

  // Step 2: Check reviewer ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: review.shopping_mall_product_id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Associated product not found or deleted", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not authorized to respond to this review",
      403,
    );
  }

  // Step 3: Enforce single response per review
  const alreadyResponded =
    await MyGlobal.prisma.shopping_mall_review_responses.findFirst({
      where: {
        shopping_mall_review_id: review.id,
        deleted_at: null,
      },
    });
  if (alreadyResponded) {
    throw new HttpException("A response for this review already exists", 409);
  }

  // Step 4: Create seller response
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_review_responses.create({
    data: {
      id: v4(),
      shopping_mall_review_id: review.id,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_seller_session_id: props.seller.session_id,
      body: props.body.body,
      withdrawn_at: null,
      moderation_status: props.body.moderation_status,
      moderation_reason:
        typeof props.body.moderation_reason === "string"
          ? props.body.moderation_reason
          : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Hydrate seller/summary objects (DTO contract)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
    },
  });
  if (!seller) {
    throw new HttpException("Seller account not found", 404);
  }

  return {
    id: created.id,
    body: created.body,
    withdrawn_at: null,
    moderation_status: created.moderation_status,
    moderation_reason: created.moderation_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
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
          id: product.shopping_mall_seller_id,
          business_name: seller.business_name,
        },
        categories: [],
        created_at: toISOStringSafe(product.created_at),
      },
      productSku: {
        id: review.shopping_mall_product_sku_id,
        code: "",
        product_title: "",
        option_summary: "",
        in_stock: false,
      },
      productRating: {
        id: review.shopping_mall_product_rating_id,
        value: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
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
            id: product.shopping_mall_seller_id,
            business_name: seller.business_name,
          },
          categories: [],
          created_at: toISOStringSafe(product.created_at),
        },
        productSku: {
          id: review.shopping_mall_product_sku_id,
          code: "",
          product_title: "",
          option_summary: "",
          in_stock: false,
        },
      },
      orderItem: {
        id: review.shopping_mall_order_item_id,
      },
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
  };
}
