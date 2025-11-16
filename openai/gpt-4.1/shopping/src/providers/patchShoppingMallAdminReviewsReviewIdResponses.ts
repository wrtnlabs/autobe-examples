import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewResponse";
import { IPageIShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewResponse";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReviewIdResponses(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewResponse.IRequest;
}): Promise<IPageIShoppingMallReviewResponse.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_mall_review_id: props.reviewId,
    ...(props.body.moderation_status !== undefined &&
    props.body.moderation_status !== null
      ? { moderation_status: props.body.moderation_status }
      : {}),
    ...(props.body.seller_id !== undefined && props.body.seller_id !== null
      ? { shopping_mall_seller_id: props.body.seller_id }
      : {}),
    ...((props.body.withdrawn_at_from !== undefined &&
      props.body.withdrawn_at_from !== null) ||
    (props.body.withdrawn_at_to !== undefined &&
      props.body.withdrawn_at_to !== null)
      ? {
          withdrawn_at: {
            ...(props.body.withdrawn_at_from !== undefined &&
            props.body.withdrawn_at_from !== null
              ? { gte: props.body.withdrawn_at_from }
              : {}),
            ...(props.body.withdrawn_at_to !== undefined &&
            props.body.withdrawn_at_to !== null
              ? { lte: props.body.withdrawn_at_to }
              : {}),
          },
        }
      : {}),
    ...((props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined &&
            props.body.created_at_from !== null
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to !== undefined &&
            props.body.created_at_to !== null
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...((props.body.updated_at_from !== undefined &&
      props.body.updated_at_from !== null) ||
    (props.body.updated_at_to !== undefined &&
      props.body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(props.body.updated_at_from !== undefined &&
            props.body.updated_at_from !== null
              ? { gte: props.body.updated_at_from }
              : {}),
            ...(props.body.updated_at_to !== undefined &&
            props.body.updated_at_to !== null
              ? { lte: props.body.updated_at_to }
              : {}),
          },
        }
      : {}),
  };
  let orderBy: Record<string, unknown>[] | undefined = undefined;
  if (props.body.sort_by) {
    orderBy = [{ [props.body.sort_by]: props.body.sort_direction ?? "desc" }];
  }
  const [responses, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_responses.findMany({
      where,
      skip: offset,
      take: limit,
      ...(orderBy ? { orderBy } : {}),
      include: {
        review: {
          include: {
            customer: true,
            product: true,
            productSku: true,
            productRating: true,
            orderItem: true,
          },
        },
        seller: true,
        sellerSession: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_review_responses.count({ where }),
  ]);
  const data = responses.map((response) => {
    const review = response.review;
    const product = review.product;
    const productSku = review.productSku;
    const productRating = review.productRating;
    return {
      id: response.id,
      body: response.body,
      withdrawn_at:
        response.withdrawn_at !== null && response.withdrawn_at !== undefined
          ? toISOStringSafe(response.withdrawn_at)
          : undefined,
      moderation_status: response.moderation_status,
      moderation_reason:
        response.moderation_reason !== null &&
        response.moderation_reason !== undefined
          ? response.moderation_reason
          : undefined,
      created_at: toISOStringSafe(response.created_at),
      updated_at: toISOStringSafe(response.updated_at),
      deleted_at:
        response.deleted_at !== null && response.deleted_at !== undefined
          ? toISOStringSafe(response.deleted_at)
          : undefined,
      review: {
        id: review.id,
        title: review.title,
        is_draft: review.is_draft,
        moderation_status: review.moderation_status,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        customer: {
          id: review.customer.id,
          name: review.customer.name,
        },
        product: {
          id: product.id,
          title: product.title,
          default_price: product.default_price,
          business_status: product.business_status,
          seller: { id: product.shopping_mall_seller_id, business_name: "" },
          categories: [],
          created_at: toISOStringSafe(product.created_at),
        },
        productSku: {
          id: productSku.id,
          code: productSku.sku_code,
          product_title: product.title,
          option_summary: "",
          in_stock: true,
        },
        productRating:
          productRating !== null && productRating !== undefined
            ? {
                id: productRating.id,
                value: productRating.value,
                created_at: toISOStringSafe(productRating.created_at),
                updated_at: toISOStringSafe(productRating.updated_at),
                deleted_at:
                  productRating.deleted_at !== null &&
                  productRating.deleted_at !== undefined
                    ? toISOStringSafe(productRating.deleted_at)
                    : undefined,
                customer: {
                  id: productRating.shopping_mall_customer_id,
                  name: "",
                },
                product: {
                  id: productRating.shopping_mall_product_id,
                  title: "",
                  default_price: 0,
                  business_status: "",
                  seller: { id: "", business_name: "" },
                  categories: [],
                  created_at: toISOStringSafe(productRating.created_at),
                },
                productSku: {
                  id: productRating.shopping_mall_product_sku_id,
                  code: "",
                  product_title: "",
                  option_summary: "",
                  in_stock: true,
                },
              }
            : typia.random<IShoppingMallProductRating.ISummary>(),
        orderItem: { id: review.orderItem.id },
      },
      seller: {
        id: response.seller.id,
        business_name: response.seller.business_name,
      },
      sellerSession: {
        id: response.sellerSession.id,
        shopping_mall_seller_id: response.sellerSession.shopping_mall_seller_id,
        ip: response.sellerSession.ip,
        href: response.sellerSession.href,
        referrer: response.sellerSession.referrer,
        created_at: toISOStringSafe(response.sellerSession.created_at),
        expired_at:
          response.sellerSession.expired_at !== null &&
          response.sellerSession.expired_at !== undefined
            ? toISOStringSafe(response.sellerSession.expired_at)
            : undefined,
      },
    };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
