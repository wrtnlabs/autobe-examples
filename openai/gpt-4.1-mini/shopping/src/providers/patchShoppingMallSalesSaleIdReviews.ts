import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSalesSaleIdReviews(props: {
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReview.IRequest;
}): Promise<IPageIShoppingMallSaleReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_sale_id: props.saleId,
    deleted_at: null,
    ...(props.body.rating !== undefined && props.body.rating !== null
      ? { rating: { gte: props.body.rating } }
      : {}),
    ...(props.body.body !== undefined && props.body.body !== null
      ? { body: { contains: props.body.body, mode: "insensitive" } }
      : {}),
  } satisfies Prisma.shopping_mall_sale_reviewsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_sale_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { rating: "desc" }],
    select: {
      id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sale: {
        select: {
          id: true,
          name: true,
          base_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_uri: true,
              approval_status: true,
              rejection_reason: true,
            },
          } satisfies Prisma.shopping_mall_sellersFindManyArgs,
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          } satisfies Prisma.shopping_mall_product_categoriesFindManyArgs,
        },
      },
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
        },
      } satisfies Prisma.shopping_mall_customersFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_reviews.count({
    where,
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: data.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      created_at: toISOStringSafe(review.created_at) as unknown as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(review.updated_at) as unknown as string &
        tags.Format<"date-time">,
      deleted_at: review.deleted_at
        ? (toISOStringSafe(review.deleted_at) as unknown as string &
            tags.Format<"date-time">)
        : null,
      sale: {
        id: review.sale.id,
        name: review.sale.name,
        base_price: review.sale.base_price,
        status: review.sale.status,
        created_at: toISOStringSafe(
          review.sale.created_at,
        ) as unknown as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          review.sale.updated_at,
        ) as unknown as string & tags.Format<"date-time">,
        deleted_at: review.sale.deleted_at
          ? (toISOStringSafe(review.sale.deleted_at) as unknown as string &
              tags.Format<"date-time">)
          : null,
        seller: {
          id: review.sale.seller.id,
          email: review.sale.seller.email,
          shop_name: review.sale.seller.shop_name,
          shop_description: review.sale.seller.shop_description ?? null,
          logo_uri: review.sale.seller.logo_uri ?? null,
          approval_status: review.sale.seller.approval_status,
          rejection_reason: review.sale.seller.rejection_reason ?? null,
        },
        category: {
          id: review.sale.category.id,
          name: review.sale.category.name,
          description: review.sale.category.description,
          created_at: toISOStringSafe(
            review.sale.category.created_at,
          ) as unknown as string & tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            review.sale.category.updated_at,
          ) as unknown as string & tags.Format<"date-time">,
          deleted_at: review.sale.category.deleted_at
            ? (toISOStringSafe(
                review.sale.category.deleted_at,
              ) as unknown as string & tags.Format<"date-time">)
            : null,
        },
      },
      customer: {
        id: review.customer.id,
        email: review.customer.email,
        display_name: review.customer.display_name ?? null,
        phone_number: review.customer.phone_number ?? null,
        created_at: toISOStringSafe(
          review.customer.created_at,
        ) as unknown as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          review.customer.updated_at,
        ) as unknown as string & tags.Format<"date-time">,
      },
    })),
  };
}
