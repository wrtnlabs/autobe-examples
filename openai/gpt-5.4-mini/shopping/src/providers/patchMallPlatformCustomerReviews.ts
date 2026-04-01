import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
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

export async function patchMallPlatformCustomerReviews(props: {
  customer: CustomerPayload;
  body: IMallPlatformReview.IRequest;
}): Promise<IPageIMallPlatformReview.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination values", 400);
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "latest" &&
    props.body.sort !== "created_at" &&
    props.body.sort !== "createdAt"
  ) {
    throw new HttpException("Invalid sort value", 400);
  }
  const where: Prisma.mall_platform_reviewsWhereInput = {
    deleted_at: null,
    ...(props.body.productId !== undefined
      ? { product_id: props.body.productId }
      : {}),
    ...(props.body.rating !== undefined ? { rating: props.body.rating } : {}),
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          content: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.mall_platform_reviews.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      customer: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      orderItem: {
        select: {
          id: true,
          quantity: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          order: {
            select: {
              id: true,
              order_number: true,
              status: true,
              total_amount: true,
              created_at: true,
            },
          },
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              option_values: true,
              price_override: true,
              is_active: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  sellerAccount: {
                    select: {
                      id: true,
                      email: true,
                      approval_status: true,
                      rejection_reason: true,
                      suspended_at: true,
                      deleted_at: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                  category: {
                    select: {
                      id: true,
                      parentCategory: {
                        select: {
                          id: true,
                          parentCategory: {
                            select: {
                              id: true,
                              name: true,
                              description: true,
                              created_at: true,
                              updated_at: true,
                              deleted_at: true,
                            },
                          },
                          name: true,
                          description: true,
                          created_at: true,
                          updated_at: true,
                          deleted_at: true,
                        },
                      },
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              status: true,
              rejection_reason: true,
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sellerAccount: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              rejection_reason: true,
              suspended_at: true,
              deleted_at: true,
              created_at: true,
              updated_at: true,
            },
          },
          category: {
            select: {
              id: true,
              parentCategory: {
                select: {
                  id: true,
                  parentCategory: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      rating: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.mall_platform_reviews.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      async (review) =>
        ({
          id: review.id,
          customer: {
            id: review.customer.id,
            email: review.customer.email,
            status: review.customer.status,
            created_at: review.customer.created_at.toISOString(),
            updated_at: review.customer.updated_at.toISOString(),
            deleted_at: review.customer.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformCustomer.ISummary,
          orderItem: {
            id: review.orderItem.id,
            quantity: review.orderItem.quantity,
            status: review.orderItem.status,
            order: {
              id: review.orderItem.order.id,
              orderNumber: review.orderItem.order.order_number,
              status: review.orderItem.order.status,
              totalAmount: review.orderItem.order.total_amount,
              createdAt: review.orderItem.order.created_at.toISOString(),
            } satisfies IMallPlatformOrder.ISummary,
            productVariant: {
              id: review.orderItem.productVariant.id,
              skuCode: review.orderItem.productVariant.sku_code,
              optionValues: review.orderItem.productVariant.option_values,
              priceOverride: review.orderItem.productVariant.price_override,
              isActive: review.orderItem.productVariant.is_active,
              product: {
                id: review.orderItem.productVariant.product.id,
                name: review.orderItem.productVariant.product.name,
                description:
                  review.orderItem.productVariant.product.description,
                basePrice: review.orderItem.productVariant.product.base_price,
                sellerAccount: {
                  id: review.orderItem.productVariant.product.sellerAccount.id,
                  email:
                    review.orderItem.productVariant.product.sellerAccount.email,
                  approvalStatus:
                    review.orderItem.productVariant.product.sellerAccount
                      .approval_status,
                  rejectionReason:
                    review.orderItem.productVariant.product.sellerAccount
                      .rejection_reason,
                  suspendedAt:
                    review.orderItem.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                    null,
                  deletedAt:
                    review.orderItem.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                    null,
                  createdAt:
                    review.orderItem.productVariant.product.sellerAccount.created_at.toISOString(),
                  updatedAt:
                    review.orderItem.productVariant.product.sellerAccount.updated_at.toISOString(),
                } satisfies IMallPlatformSellerAccount.ISummary,
                category:
                  review.orderItem.productVariant.product.category === null
                    ? null
                    : ({
                        id: review.orderItem.productVariant.product.category.id,
                        parentCategory:
                          review.orderItem.productVariant.product.category
                            .parentCategory === null
                            ? null
                            : ({
                                id: review.orderItem.productVariant.product
                                  .category.parentCategory.id,
                                parentCategory:
                                  review.orderItem.productVariant.product
                                    .category.parentCategory.parentCategory ===
                                  null
                                    ? null
                                    : ({
                                        id: review.orderItem.productVariant
                                          .product.category.parentCategory
                                          .parentCategory.id,
                                        parentCategory: null,
                                        name: review.orderItem.productVariant
                                          .product.category.parentCategory
                                          .parentCategory.name,
                                        description:
                                          review.orderItem.productVariant
                                            .product.category.parentCategory
                                            .parentCategory.description,
                                        createdAt:
                                          review.orderItem.productVariant.product.category.parentCategory.parentCategory.created_at.toISOString(),
                                        updatedAt:
                                          review.orderItem.productVariant.product.category.parentCategory.parentCategory.updated_at.toISOString(),
                                        deletedAt:
                                          review.orderItem.productVariant.product.category.parentCategory.parentCategory.deleted_at?.toISOString() ??
                                          null,
                                      } satisfies IMallPlatformCategory.ISummary),
                                name: review.orderItem.productVariant.product
                                  .category.parentCategory.name,
                                description:
                                  review.orderItem.productVariant.product
                                    .category.parentCategory.description,
                                createdAt:
                                  review.orderItem.productVariant.product.category.parentCategory.created_at.toISOString(),
                                updatedAt:
                                  review.orderItem.productVariant.product.category.parentCategory.updated_at.toISOString(),
                                deletedAt:
                                  review.orderItem.productVariant.product.category.parentCategory.deleted_at?.toISOString() ??
                                  null,
                              } satisfies IMallPlatformCategory.ISummary),
                        name: review.orderItem.productVariant.product.category
                          .name,
                        description:
                          review.orderItem.productVariant.product.category
                            .description,
                        createdAt:
                          review.orderItem.productVariant.product.category.created_at.toISOString(),
                        updatedAt:
                          review.orderItem.productVariant.product.category.updated_at.toISOString(),
                        deletedAt:
                          review.orderItem.productVariant.product.category.deleted_at?.toISOString() ??
                          null,
                      } satisfies IMallPlatformCategory.ISummary),
                createdAt:
                  review.orderItem.productVariant.product.created_at.toISOString(),
                updatedAt:
                  review.orderItem.productVariant.product.updated_at.toISOString(),
                deletedAt:
                  review.orderItem.productVariant.product.deleted_at?.toISOString() ??
                  null,
              } satisfies IMallPlatformProduct.ISummary,
              createdAt:
                review.orderItem.productVariant.created_at.toISOString(),
              updatedAt:
                review.orderItem.productVariant.updated_at.toISOString(),
              deletedAt:
                review.orderItem.productVariant.deleted_at?.toISOString() ??
                null,
            } satisfies IMallPlatformProductVariant.ISummary,
            seller: {
              id: review.orderItem.seller.id,
              email: review.orderItem.seller.email,
              status: review.orderItem.seller.status,
              rejectionReason: review.orderItem.seller.rejection_reason,
              createdAt: review.orderItem.seller.created_at.toISOString(),
              updatedAt: review.orderItem.seller.updated_at.toISOString(),
              deletedAt:
                review.orderItem.seller.deleted_at?.toISOString() ?? null,
            } satisfies IMallPlatformSeller.ISummary,
            created_at: review.orderItem.created_at.toISOString(),
            updated_at: review.orderItem.updated_at.toISOString(),
            deleted_at: review.orderItem.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformOrderItem.ISummary,
          product: {
            id: review.product.id,
            name: review.product.name,
            description: review.product.description,
            basePrice: review.product.base_price,
            sellerAccount: {
              id: review.product.sellerAccount.id,
              email: review.product.sellerAccount.email,
              approvalStatus: review.product.sellerAccount.approval_status,
              rejectionReason: review.product.sellerAccount.rejection_reason,
              suspendedAt:
                review.product.sellerAccount.suspended_at?.toISOString() ??
                null,
              deletedAt:
                review.product.sellerAccount.deleted_at?.toISOString() ?? null,
              createdAt: review.product.sellerAccount.created_at.toISOString(),
              updatedAt: review.product.sellerAccount.updated_at.toISOString(),
            } satisfies IMallPlatformSellerAccount.ISummary,
            category:
              review.product.category === null
                ? null
                : ({
                    id: review.product.category.id,
                    parentCategory:
                      review.product.category.parentCategory === null
                        ? null
                        : ({
                            id: review.product.category.parentCategory.id,
                            parentCategory:
                              review.product.category.parentCategory
                                .parentCategory === null
                                ? null
                                : ({
                                    id: review.product.category.parentCategory
                                      .parentCategory.id,
                                    parentCategory: null,
                                    name: review.product.category.parentCategory
                                      .parentCategory.name,
                                    description:
                                      review.product.category.parentCategory
                                        .parentCategory.description,
                                    createdAt:
                                      review.product.category.parentCategory.parentCategory.created_at.toISOString(),
                                    updatedAt:
                                      review.product.category.parentCategory.parentCategory.updated_at.toISOString(),
                                    deletedAt:
                                      review.product.category.parentCategory.parentCategory.deleted_at?.toISOString() ??
                                      null,
                                  } satisfies IMallPlatformCategory.ISummary),
                            name: review.product.category.parentCategory.name,
                            description:
                              review.product.category.parentCategory
                                .description,
                            createdAt:
                              review.product.category.parentCategory.created_at.toISOString(),
                            updatedAt:
                              review.product.category.parentCategory.updated_at.toISOString(),
                            deletedAt:
                              review.product.category.parentCategory.deleted_at?.toISOString() ??
                              null,
                          } satisfies IMallPlatformCategory.ISummary),
                    name: review.product.category.name,
                    description: review.product.category.description,
                    createdAt: review.product.category.created_at.toISOString(),
                    updatedAt: review.product.category.updated_at.toISOString(),
                    deletedAt:
                      review.product.category.deleted_at?.toISOString() ?? null,
                  } satisfies IMallPlatformCategory.ISummary),
            createdAt: review.product.created_at.toISOString(),
            updatedAt: review.product.updated_at.toISOString(),
            deletedAt: review.product.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformProduct.ISummary,
          rating: review.rating,
          content: review.content,
          createdAt: review.created_at.toISOString(),
          updatedAt: review.updated_at.toISOString(),
          deletedAt: review.deleted_at?.toISOString() ?? null,
        }) satisfies IMallPlatformReview.ISummary,
    ),
  };
}
