import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function patchEcommerceMallCustomerReviewsDashboard(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.limit ?? props.body.pageSize ?? 20;
  const limit = Math.min(Math.max(pageSize, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    is_active: true,
    deleted_at: null,
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    ...(props.body.productId && { product_id: props.body.productId }),
    ...(props.body.ratingMin !== undefined && {
      rating: {
        gte: props.body.ratingMin,
      },
    }),
    ...(props.body.ratingMax !== undefined && {
      rating: {
        lte: props.body.ratingMax,
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  };
  const orderByInput = (
    props.body.sortBy === "rating"
      ? { rating: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
      : props.body.sortBy === "customerId"
        ? { customer_id: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
        : { created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        customer: {},
        product: {
          include: {
            seller: {},
            category: {},
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, async (review) => {
    const customer = review.customer;
    const customerDisplay = customer.email.split("@")[0] || "Customer";
    return {
      id: review.id,
      rating: review.rating,
      textContent: review.text_content,
      customer: {
        id: customer.id,
        email: customer.email,
        isBanned: customer.is_banned,
        createdAt: customer.created_at.toISOString(),
        updatedAt: customer.updated_at.toISOString(),
        deletedAt: customer.deleted_at?.toISOString() ?? null,
        customerProfile: {
          displayName: customerDisplay,
          phoneNumber: null,
          createdAt: customer.created_at.toISOString(),
          updatedAt: customer.updated_at.toISOString(),
        } satisfies IEcommerceMallCustomerProfile.ISummary,
      } satisfies IEcommerceMallCustomer.ISummary,
      product: {
        id: review.product.id,
        name: review.product.name,
        description: review.product.description ?? null,
        base_price: review.product.base_price,
        is_active: review.product.is_active,
        created_at: review.product.created_at.toISOString(),
        seller: {
          id: review.product.seller.id,
          email: review.product.seller.email,
          approval_status: typia.assert<"pending" | "approved" | "rejected">(
            review.product.seller.approval_status,
          ),
          is_suspended: review.product.seller.is_suspended,
          is_banned: review.product.seller.is_banned,
          created_at: review.product.seller.created_at.toISOString(),
        } satisfies IEcommerceMallSeller.ISummary,
        category: {
          id: review.product.category.id,
          name: review.product.category.name,
          is_leaf: review.product.category.is_leaf,
          created_at: review.product.category.created_at.toISOString(),
          updated_at: review.product.category.updated_at.toISOString(),
          deleted_at: review.product.category.deleted_at?.toISOString() ?? null,
        } satisfies IEcommerceMallCategory.ISummary,
      } satisfies IEcommerceMallProduct.ISummary,
      isActive: review.is_active,
      createdAt: review.created_at.toISOString(),
      updatedAt: review.updated_at.toISOString(),
      deletedAt: review.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallReview.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallReview.ISummary;
}
