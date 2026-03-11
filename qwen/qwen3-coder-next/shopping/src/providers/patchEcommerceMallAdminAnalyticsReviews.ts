import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAnalyticsReviews(props: {
  admin: AdminPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      rating: true,
      text_content: true,
      customer_id: true,
      product_id: true,
      order_item_id: true,
      created_at: true,
      updated_at: true,
      customer: { select: { id: true, email: true, created_at: true } },
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          is_available: true,
          created_at: true,
          seller_id: true,
          images: {
            where: { is_main: true },
            select: {
              id: true,
              image_url: true,
              sort_order: true,
              is_main: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
            take: 1,
          },
          seller: {
            select: {
              id: true,
              shop_name: true,
              approval_status: true,
              is_suspended: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: data.map((review) => {
      const mainImage = review.product.images[0] || null;
      return {
        id: review.id,
        rating: review.rating,
        text_content: review.text_content ?? undefined,
        customer: {
          id: review.customer.id,
          email: review.customer.email,
          is_suspended: false,
          created_at: toISOStringSafe(review.customer.created_at),
        } satisfies IEcommerceMallCustomer.ISummary,
        product: {
          id: review.product.id,
          name: review.product.name,
          base_price: review.product.base_price,
          is_available: review.product.is_available,
          created_at: toISOStringSafe(review.product.created_at),
          seller: {
            id: review.product.seller_id,
            shop_name: review.product.seller.shop_name,
            approval_status: review.product.seller.approval_status,
            is_suspended: review.product.seller.is_suspended,
            created_at: toISOStringSafe(review.product.seller.created_at),
          } satisfies IEcommerceMallSeller.ISummary,
          main_image: mainImage
            ? ({
                id: mainImage.id,
                image_url: mainImage.image_url,
                sort_order: mainImage.sort_order,
                is_main: mainImage.is_main,
                created_at: toISOStringSafe(mainImage.created_at),
                updated_at: toISOStringSafe(mainImage.updated_at),
                deleted_at: mainImage.deleted_at
                  ? toISOStringSafe(mainImage.deleted_at)
                  : null,
              } satisfies IEcommerceMallProductImage.ISummary)
            : ({
                id: "",
                image_url: "",
                sort_order: 0,
                is_main: false,
                created_at: toISOStringSafe(review.product.created_at),
                updated_at: toISOStringSafe(review.product.created_at),
                deleted_at: null,
              } satisfies IEcommerceMallProductImage.ISummary),
        } satisfies IEcommerceMallProduct.ISummary,
        order_item_id: review.order_item_id,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
      } satisfies IEcommerceMallReview.ISummary;
    }),
  } satisfies IPageIEcommerceMallReview.ISummary;
}
