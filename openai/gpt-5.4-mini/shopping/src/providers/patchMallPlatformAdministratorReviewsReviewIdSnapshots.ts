import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorReviewsReviewIdSnapshots(props: {
  administrator: AdministratorPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IMallPlatformReviewSnapshot.IRequest;
}): Promise<IPageIMallPlatformReviewSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  const where: Prisma.mall_platform_review_snapshotsWhereInput = {
    mall_platform_review_id: props.reviewId,
    ...(props.body.customerId !== undefined
      ? { mall_platform_customer_id: props.body.customerId }
      : {}),
    ...(props.body.snapshotAction !== undefined
      ? { snapshot_action: props.body.snapshotAction }
      : {}),
    ...(props.body.isDeleted !== undefined
      ? { is_deleted: props.body.isDeleted }
      : {}),
    ...(props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
      ? {
          rating: {
            ...(props.body.ratingMin !== undefined
              ? { gte: props.body.ratingMin }
              : {}),
            ...(props.body.ratingMax !== undefined
              ? { lte: props.body.ratingMax }
              : {}),
          },
        }
      : {}),
    ...(props.body.content !== undefined
      ? {
          content: {
            contains: props.body.content,
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
  };
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.mall_platform_review_snapshotsOrderByWithRelationInput =
    props.body.sort === "rating"
      ? { rating: props.body.order ?? "desc" }
      : props.body.sort === "snapshotAction"
        ? { snapshot_action: props.body.order ?? "desc" }
        : props.body.sort === "content"
          ? { content: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" };
  const data = await MyGlobal.prisma.mall_platform_review_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      review: {
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
                          name: true,
                          description: true,
                          created_at: true,
                          updated_at: true,
                          deleted_at: true,
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
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
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
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
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
      },
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
      snapshot_action: true,
      rating: true,
      content: true,
      is_deleted: true,
      created_at: true,
    },
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_review_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(data, async (row) => ({
      id: row.id,
      review: {
        id: row.review.id,
        customer: {
          id: row.review.customer.id,
          email: row.review.customer.email,
          status: row.review.customer.status,
          created_at: row.review.customer.created_at.toISOString(),
          updated_at: row.review.customer.updated_at.toISOString(),
          deleted_at: row.review.customer.deleted_at?.toISOString() ?? null,
        },
        orderItem: {
          id: row.review.orderItem.id,
          quantity: row.review.orderItem.quantity,
          status: row.review.orderItem.status,
          order: {
            id: row.review.orderItem.order.id,
            orderNumber: row.review.orderItem.order.order_number,
            status: row.review.orderItem.order.status,
            totalAmount: row.review.orderItem.order.total_amount,
            createdAt: row.review.orderItem.order.created_at.toISOString(),
          },
          productVariant: {
            id: row.review.orderItem.productVariant.id,
            skuCode: row.review.orderItem.productVariant.sku_code,
            optionValues: row.review.orderItem.productVariant.option_values,
            priceOverride: row.review.orderItem.productVariant.price_override,
            isActive: row.review.orderItem.productVariant.is_active,
            product: {
              id: row.review.orderItem.productVariant.product.id,
              name: row.review.orderItem.productVariant.product.name,
              description:
                row.review.orderItem.productVariant.product.description,
              basePrice: row.review.orderItem.productVariant.product.base_price,
              sellerAccount: {
                id: row.review.orderItem.productVariant.product.sellerAccount
                  .id,
                email:
                  row.review.orderItem.productVariant.product.sellerAccount
                    .email,
                approvalStatus:
                  row.review.orderItem.productVariant.product.sellerAccount
                    .approval_status,
                rejectionReason:
                  row.review.orderItem.productVariant.product.sellerAccount
                    .rejection_reason,
                suspendedAt:
                  row.review.orderItem.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                  null,
                deletedAt:
                  row.review.orderItem.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                  null,
                createdAt:
                  row.review.orderItem.productVariant.product.sellerAccount.created_at.toISOString(),
                updatedAt:
                  row.review.orderItem.productVariant.product.sellerAccount.updated_at.toISOString(),
              },
              category:
                row.review.orderItem.productVariant.product.category === null
                  ? null
                  : {
                      id: row.review.orderItem.productVariant.product.category
                        .id,
                      parentCategory:
                        row.review.orderItem.productVariant.product.category
                          .parentCategory === null
                          ? null
                          : {
                              id: row.review.orderItem.productVariant.product
                                .category.parentCategory.id,
                              parentCategory: null,
                              name: row.review.orderItem.productVariant.product
                                .category.parentCategory.name,
                              description:
                                row.review.orderItem.productVariant.product
                                  .category.parentCategory.description,
                              createdAt:
                                row.review.orderItem.productVariant.product.category.parentCategory.created_at.toISOString(),
                              updatedAt:
                                row.review.orderItem.productVariant.product.category.parentCategory.updated_at.toISOString(),
                              deletedAt:
                                row.review.orderItem.productVariant.product.category.parentCategory.deleted_at?.toISOString() ??
                                null,
                            },
                      name: row.review.orderItem.productVariant.product.category
                        .name,
                      description:
                        row.review.orderItem.productVariant.product.category
                          .description,
                      createdAt:
                        row.review.orderItem.productVariant.product.category.created_at.toISOString(),
                      updatedAt:
                        row.review.orderItem.productVariant.product.category.updated_at.toISOString(),
                      deletedAt:
                        row.review.orderItem.productVariant.product.category.deleted_at?.toISOString() ??
                        null,
                    },
              createdAt:
                row.review.orderItem.productVariant.product.created_at.toISOString(),
              updatedAt:
                row.review.orderItem.productVariant.product.updated_at.toISOString(),
              deletedAt:
                row.review.orderItem.productVariant.product.deleted_at?.toISOString() ??
                null,
            },
            seller: {
              id: row.review.orderItem.productVariant.seller.id,
              email: row.review.orderItem.productVariant.seller.email,
              status: row.review.orderItem.productVariant.seller.status,
              rejectionReason:
                row.review.orderItem.productVariant.seller.rejection_reason,
              createdAt:
                row.review.orderItem.productVariant.seller.created_at.toISOString(),
              updatedAt:
                row.review.orderItem.productVariant.seller.updated_at.toISOString(),
              deletedAt:
                row.review.orderItem.productVariant.seller.deleted_at?.toISOString() ??
                null,
            },
            createdAt:
              row.review.orderItem.productVariant.created_at.toISOString(),
            updatedAt:
              row.review.orderItem.productVariant.updated_at.toISOString(),
            deletedAt:
              row.review.orderItem.productVariant.deleted_at?.toISOString() ??
              null,
          },
          created_at: row.review.orderItem.created_at.toISOString(),
          updated_at: row.review.orderItem.updated_at.toISOString(),
          deleted_at: row.review.orderItem.deleted_at?.toISOString() ?? null,
        },
        product: {
          id: row.review.product.id,
          name: row.review.product.name,
          description: row.review.product.description,
          basePrice: row.review.product.base_price,
          sellerAccount: {
            id: row.review.product.sellerAccount.id,
            email: row.review.product.sellerAccount.email,
            approvalStatus: row.review.product.sellerAccount.approval_status,
            rejectionReason: row.review.product.sellerAccount.rejection_reason,
            suspendedAt:
              row.review.product.sellerAccount.suspended_at?.toISOString() ??
              null,
            deletedAt:
              row.review.product.sellerAccount.deleted_at?.toISOString() ??
              null,
            createdAt:
              row.review.product.sellerAccount.created_at.toISOString(),
            updatedAt:
              row.review.product.sellerAccount.updated_at.toISOString(),
          },
          category:
            row.review.product.category === null
              ? null
              : {
                  id: row.review.product.category.id,
                  parentCategory:
                    row.review.product.category.parentCategory === null
                      ? null
                      : {
                          id: row.review.product.category.parentCategory.id,
                          parentCategory: null,
                          name: row.review.product.category.parentCategory.name,
                          description:
                            row.review.product.category.parentCategory
                              .description,
                          createdAt:
                            row.review.product.category.parentCategory.created_at.toISOString(),
                          updatedAt:
                            row.review.product.category.parentCategory.updated_at.toISOString(),
                          deletedAt:
                            row.review.product.category.parentCategory.deleted_at?.toISOString() ??
                            null,
                        },
                  name: row.review.product.category.name,
                  description: row.review.product.category.description,
                  createdAt:
                    row.review.product.category.created_at.toISOString(),
                  updatedAt:
                    row.review.product.category.updated_at.toISOString(),
                  deletedAt:
                    row.review.product.category.deleted_at?.toISOString() ??
                    null,
                },
          createdAt: row.review.product.created_at.toISOString(),
          updatedAt: row.review.product.updated_at.toISOString(),
          deletedAt: row.review.product.deleted_at?.toISOString() ?? null,
        },
        rating: row.review.rating,
        content: row.review.content,
        createdAt: row.review.created_at.toISOString(),
        updatedAt: row.review.updated_at.toISOString(),
        deletedAt: row.review.deleted_at?.toISOString() ?? null,
      },
      customer: {
        id: row.customer.id,
        email: row.customer.email,
        status: row.customer.status,
        created_at: row.customer.created_at.toISOString(),
        updated_at: row.customer.updated_at.toISOString(),
        deleted_at: row.customer.deleted_at?.toISOString() ?? null,
      },
      snapshotAction: row.snapshot_action,
      rating: row.rating,
      content: row.content,
      isDeleted: row.is_deleted,
      createdAt: row.created_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
