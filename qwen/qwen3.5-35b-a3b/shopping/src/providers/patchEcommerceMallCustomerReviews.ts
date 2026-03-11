import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  if (page < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  if (limit < 0 || limit > 100) {
    throw new HttpException("Limit must be between 0 and 100", 400);
  }
  if (props.body.ratingMin !== undefined) {
    if (
      props.body.ratingMin < 1 ||
      props.body.ratingMin > 5 ||
      !Number.isInteger(props.body.ratingMin)
    ) {
      throw new HttpException(
        "Rating minimum must be an integer between 1 and 5",
        400,
      );
    }
  }
  if (props.body.ratingMax !== undefined) {
    if (
      props.body.ratingMax < 1 ||
      props.body.ratingMax > 5 ||
      !Number.isInteger(props.body.ratingMax)
    ) {
      throw new HttpException(
        "Rating maximum must be an integer between 1 and 5",
        400,
      );
    }
  }
  if (
    props.body.ratingMin !== undefined &&
    props.body.ratingMax !== undefined &&
    props.body.ratingMin > props.body.ratingMax
  ) {
    throw new HttpException(
      "Rating minimum cannot be greater than rating maximum",
      400,
    );
  }
  if (
    props.body.customerId !== undefined &&
    props.body.customerId !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    ...(props.body.customerId !== undefined && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.isActive !== undefined
      ? {
          is_active: props.body.isActive,
        }
      : {
          is_active: true,
        }),
    ...(props.body.ratingMin !== undefined && {
      rating: {
        gte: props.body.ratingMin as number,
      },
    }),
    ...(props.body.ratingMax !== undefined && {
      rating: {
        lte: props.body.ratingMax as number,
      },
    }),
    ...(props.body.dateFrom !== undefined && {
      created_at: {
        gte: props.body.dateFrom,
      },
    }),
    ...(props.body.dateTo !== undefined && {
      created_at: {
        lte: props.body.dateTo,
      },
    }),
  };
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput =
    sortBy === "rating"
      ? ({
          rating: sortOrder as "asc" | "desc",
        } satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput)
      : sortBy === "productName"
        ? ({
            product: { name: sortOrder as "asc" | "desc" },
          } satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput)
        : ({
            created_at: sortOrder as "asc" | "desc",
          } satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput);
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      customer_id: true,
      product_id: true,
      rating: true,
      text_content: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const customerIds = Array.from(new Set(reviews.map((r) => r.customer_id)));
  const productIds = Array.from(new Set(reviews.map((r) => r.product_id)));
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      email: true,
      is_banned: true,
      created_at: true,
    },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      base_price: true,
      is_active: true,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          is_leaf: true,
          created_at: true,
          deleted_at: true,
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          rejection_reason: true,
          is_suspended: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const data = await ArrayUtil.asyncMap(
    reviews,
    async (review): Promise<IEcommerceMallReview.ISummary> => {
      const customer = customerMap.get(review.customer_id);
      const product = productMap.get(review.product_id);
      if (!customer || !product) {
        throw new HttpException(
          "Customer or product not found for review",
          404,
        );
      }
      const category = product.category;
      const seller = product.seller;
      return {
        id: review.id,
        customer: {
          id: customer.id,
          email: customer.email,
          display_name: "",
          is_banned: customer.is_banned,
          created_at: toISOStringSafe(customer.created_at),
        } satisfies IEcommerceMallCustomer.ISummary,
        product: {
          id: product.id,
          name: product.name,
          basePrice: Number(product.base_price),
          isActive: product.is_active,
          category: {
            id: category.id,
            name: category.name,
            description: category.description,
            isLeaf: category.is_leaf,
            createdAt: toISOStringSafe(category.created_at),
            deletedAt: category.deleted_at
              ? toISOStringSafe(category.deleted_at)
              : null,
          } satisfies IEcommerceMallCategory.ISummary,
          seller: {
            id: seller.id,
            email: seller.email,
            approvalStatus: seller.approval_status as
              | "pending"
              | "approved"
              | "rejected",
            rejectionReason: seller.rejection_reason,
            isSuspended: seller.is_suspended,
            isBanned: seller.is_banned,
            createdAt: toISOStringSafe(seller.created_at),
            updatedAt: toISOStringSafe(seller.updated_at),
          } satisfies IEcommerceMallSeller.ISummary,
        } satisfies IEcommerceMallProduct.ISummary,
        rating: review.rating,
        text_content: review.text_content ?? null,
        is_active: review.is_active,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        deleted_at: review.deleted_at
          ? toISOStringSafe(review.deleted_at)
          : null,
      } satisfies IEcommerceMallReview.ISummary;
    },
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
