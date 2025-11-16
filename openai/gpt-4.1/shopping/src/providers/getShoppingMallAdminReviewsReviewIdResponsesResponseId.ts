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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsReviewIdResponsesResponseId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewResponse> {
  const response =
    await MyGlobal.prisma.shopping_mall_review_responses.findUnique({
      where: { id: props.responseId },
      include: {
        review: true,
        seller: true,
      },
    });

  if (
    !response ||
    response.shopping_mall_review_id !== props.reviewId ||
    !response.review ||
    !response.seller
  ) {
    throw new HttpException(
      "Seller review response not found for the given review and response id.",
      404,
    );
  }

  return {
    id: response.id,
    body: response.body,
    withdrawn_at: response.withdrawn_at
      ? toISOStringSafe(response.withdrawn_at)
      : undefined,
    moderation_status: response.moderation_status,
    moderation_reason: response.moderation_reason ?? null,
    created_at: toISOStringSafe(response.created_at),
    updated_at: toISOStringSafe(response.updated_at),
    deleted_at: response.deleted_at
      ? toISOStringSafe(response.deleted_at)
      : undefined,
    review: {
      id: response.review.id,
      title: response.review.title,
      is_draft: response.review.is_draft,
      moderation_status: response.review.moderation_status,
      created_at: toISOStringSafe(response.review.created_at),
      updated_at: toISOStringSafe(response.review.updated_at),
      customer: {
        id: response.review.shopping_mall_customer_id as string &
          tags.Format<"uuid">,
        name: "",
      },
      product: {
        id: response.review.shopping_mall_product_id as string &
          tags.Format<"uuid">,
        title: "",
        default_price: 0,
        business_status: "",
        seller: {
          id: "",
          business_name: "",
        },
        categories: [],
        created_at: "",
      },
      productSku: {
        id: "",
        code: "",
        product_title: "",
        option_summary: "",
        in_stock: false,
      },
      productRating: {
        id: "",
        value: 1,
        created_at: "",
        updated_at: "",
        customer: {
          id: "",
          name: "",
        },
        product: {
          id: "",
          title: "",
          default_price: 0,
          business_status: "",
          seller: {
            id: "",
            business_name: "",
          },
          categories: [],
          created_at: "",
        },
        productSku: {
          id: "",
          code: "",
          product_title: "",
          option_summary: "",
          in_stock: false,
        },
        deleted_at: undefined,
      },
      orderItem: { id: "" },
    },
    seller: {
      id: response.seller.id,
      business_name: response.seller.business_name,
    },
  };
}
