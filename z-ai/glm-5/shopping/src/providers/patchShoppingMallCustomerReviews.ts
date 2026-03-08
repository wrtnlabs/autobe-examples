import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.productId !== undefined && {
      shopping_mall_product_id: props.body.productId,
    }),
    ...(props.body.orderId !== undefined && {
      shopping_mall_order_id: props.body.orderId,
    }),
    ...(props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
      ? {
          rating: {
            ...(props.body.ratingMin !== undefined && {
              gte: props.body.ratingMin,
            }),
            ...(props.body.ratingMax !== undefined && {
              lte: props.body.ratingMax,
            }),
          },
        }
      : {}),
    ...(props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdFrom !== undefined && {
              gte: new Date(props.body.createdFrom),
            }),
            ...(props.body.createdTo !== undefined && {
              lte: new Date(props.body.createdTo),
            }),
          },
        }
      : {}),
    ...(props.body.search !== undefined && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      rating: true,
      content: true,
      created_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          banned: true,
          created_at: true,
          deleted_at: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          created_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
              shop_name: true,
              logo_image: true,
              approval_status: true,
              suspended: true,
              banned: true,
              created_at: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              parent_id: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                },
              },
            },
          },
          images: {
            select: { image_url: true, display_order: true },
            orderBy: { display_order: "asc" as const },
            take: 1,
          },
          variants: {
            select: { price: true },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  const data: IShoppingMallReview.ISummary[] = reviews.map((review) => {
    const author: IShoppingMallCustomer.ISummary | null =
      review.customer.deleted_at !== null
        ? null
        : ({
            id: review.customer.id,
            email: review.customer.email,
            displayName: review.customer.display_name,
            phoneNumber: review.customer.phone_number,
            banned: review.customer.banned,
            createdAt: review.customer.created_at.toISOString(),
          } satisfies IShoppingMallCustomer.ISummary);
    const product: IShoppingMallProduct.ISummary | null =
      review.product.deleted_at !== null
        ? null
        : (() => {
            const variantPrices = review.product.variants.map(
              (v) => v.price ?? review.product.base_price,
            );
            const minPrice =
              variantPrices.length > 0
                ? Math.min(...variantPrices)
                : review.product.base_price;
            const maxPrice =
              variantPrices.length > 0
                ? Math.max(...variantPrices)
                : review.product.base_price;
            return {
              id: review.product.id,
              name: review.product.name,
              base_price: review.product.base_price,
              min_price: minPrice,
              max_price: maxPrice,
              thumbnail: review.product.images[0]?.image_url ?? null,
              average_rating: null,
              review_count: 0,
              seller: {
                id: review.product.seller.id,
                shop_name: review.product.seller.shop_name,
                logo_image: review.product.seller.logo_image ?? null,
                approval_status: review.product.seller.approval_status as
                  | "pending"
                  | "approved"
                  | "rejected",
                suspended: review.product.seller.suspended,
                banned: review.product.seller.banned,
                created_at: review.product.seller.created_at.toISOString(),
              } satisfies IShoppingMallSeller.ISummary,
              category: {
                id: review.product.category.id,
                name: review.product.category.name,
                description: review.product.category.description,
                parent: review.product.category.parent
                  ? ({
                      id: review.product.category.parent.id,
                      name: review.product.category.parent.name,
                      description: review.product.category.parent.description,
                      created_at:
                        review.product.category.parent.created_at.toISOString(),
                      parent: null,
                    } satisfies IShoppingMallCategory.ISummary)
                  : null,
                created_at: review.product.category.created_at.toISOString(),
              } satisfies IShoppingMallCategory.ISummary,
              out_of_stock: false,
              created_at: review.product.created_at.toISOString(),
            } satisfies IShoppingMallProduct.ISummary;
          })();
    return {
      id: review.id,
      rating: review.rating,
      content: review.content,
      author,
      product,
      created_at: review.created_at.toISOString(),
    } satisfies IShoppingMallReview.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallReview.ISummary;
}
