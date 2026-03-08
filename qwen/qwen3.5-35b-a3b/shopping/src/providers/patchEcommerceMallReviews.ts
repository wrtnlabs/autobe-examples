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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallReviews(props: {
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? props.body.pageSize ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    is_active: true,
  };
  if (props.body.productId !== undefined) {
    whereInput.product = { id: props.body.productId };
  }
  if (props.body.customerId !== undefined) {
    whereInput.customer_id = props.body.customerId;
  }
  if (
    props.body.ratingMin !== undefined &&
    props.body.ratingMax !== undefined
  ) {
    whereInput.rating = {
      gte: props.body.ratingMin,
      lte: props.body.ratingMax,
    };
  } else if (props.body.ratingMin !== undefined) {
    whereInput.rating = { gte: props.body.ratingMin };
  } else if (props.body.ratingMax !== undefined) {
    whereInput.rating = { lte: props.body.ratingMax };
  }
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined
  ) {
    whereInput.created_at = {
      gte: props.body.createdAtFrom,
      lte: props.body.createdAtTo,
    };
  } else if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = { gte: props.body.createdAtFrom };
  } else if (props.body.createdAtTo !== undefined) {
    whereInput.created_at = { lte: props.body.createdAtTo };
  }
  if (props.body.searchText !== undefined && props.body.searchText.length > 0) {
    whereInput.text_content = {
      contains: props.body.searchText,
      mode: "insensitive",
    };
  }
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput[] =
    (() => {
      const sortBy = props.body.sortBy ?? "createdAt";
      const sortOrder = props.body.sortOrder ?? "desc";
      const direction = sortOrder === "asc" ? "asc" : "desc";
      switch (sortBy) {
        case "rating":
          return [{ rating: direction }];
        case "customerId":
          return [{ customer_id: direction }];
        default:
          return [{ created_at: direction }];
      }
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        rating: true,
        text_content: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer_profile: {
              select: {
                id: true,
                display_name: true,
                phone: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
                deleted_at: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                is_leaf: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    is_leaf: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    const customerProfile = item.customer.customer_profile;
    const category = item.product.category;
    const parent = category.parent;
    return {
      id: item.id,
      rating: item.rating,
      textContent: item.text_content ?? null,
      isActive: item.is_active,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
      customer: {
        id: item.customer.id,
        email: item.customer.email,
        isBanned: item.customer.is_banned,
        createdAt: toISOStringSafe(item.customer.created_at),
        updatedAt: toISOStringSafe(item.customer.updated_at),
        deletedAt:
          item.customer.deleted_at !== null
            ? toISOStringSafe(item.customer.deleted_at)
            : null,
        customerProfile: {
          id: customerProfile.id,
          displayName: customerProfile.display_name,
          phoneNumber: customerProfile.phone,
          createdAt: toISOStringSafe(customerProfile.created_at),
          updatedAt: toISOStringSafe(customerProfile.updated_at),
          deletedAt:
            customerProfile.deleted_at !== null
              ? toISOStringSafe(customerProfile.deleted_at)
              : null,
        },
      },
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        basePrice: item.product.base_price,
        isActive: item.product.is_active,
        createdAt: toISOStringSafe(item.product.created_at),
        updatedAt: toISOStringSafe(item.product.updated_at),
        deletedAt:
          item.product.deleted_at !== null
            ? toISOStringSafe(item.product.deleted_at)
            : null,
        seller: {
          id: item.product.seller.id,
          email: item.product.seller.email,
          approvalStatus: item.product.seller.approval_status,
          rejectionReason: item.product.seller.rejection_reason,
          isSuspended: item.product.seller.is_suspended,
          isBanned: item.product.seller.is_banned,
          createdAt: toISOStringSafe(item.product.seller.created_at),
          updatedAt: toISOStringSafe(item.product.seller.updated_at),
          deletedAt:
            item.product.seller.deleted_at !== null
              ? toISOStringSafe(item.product.seller.deleted_at)
              : null,
        },
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          isLeaf: category.is_leaf,
          createdAt: toISOStringSafe(category.created_at),
          updatedAt: toISOStringSafe(category.updated_at),
          deletedAt:
            category.deleted_at !== null
              ? toISOStringSafe(category.deleted_at)
              : null,
          parent:
            parent !== null
              ? {
                  id: parent.id,
                  name: parent.name,
                  isLeaf: parent.is_leaf,
                  createdAt: toISOStringSafe(parent.created_at),
                  updatedAt: toISOStringSafe(parent.updated_at),
                  deletedAt:
                    parent.deleted_at !== null
                      ? toISOStringSafe(parent.deleted_at)
                      : null,
                }
              : null,
        },
      },
    } satisfies IEcommerceMallReview.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
