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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IMallPlatformReviewSnapshot.IRequest;
}): Promise<IPageIMallPlatformReviewSnapshot.ISummary> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_review_id: props.reviewId,
    ...(props.body.customerId !== undefined && {
      mall_platform_customer_id: props.body.customerId,
    }),
    ...(props.body.snapshotAction !== undefined && {
      snapshot_action: props.body.snapshotAction,
    }),
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
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
    ...(props.body.content !== undefined && {
      content: { contains: props.body.content, mode: "insensitive" },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        ...(props.body.createdAtTo !== undefined
          ? { lte: props.body.createdAtTo }
          : {}),
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtFrom === undefined &&
      props.body.createdAtTo !== undefined && {
        created_at: { lte: props.body.createdAtTo },
      }),
  } satisfies Prisma.mall_platform_review_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "rating"
      ? { rating: props.body.order ?? "desc" }
      : props.body.sort === "snapshotAction"
        ? { snapshot_action: props.body.order ?? "desc" }
        : props.body.sort === "isDeleted"
          ? { is_deleted: props.body.order ?? "desc" }
          : props.body.sort === "content"
            ? { content: props.body.order ?? "desc" }
            : props.body.sort === "createdAt"
              ? { created_at: props.body.order ?? "desc" }
              : { created_at: "desc" }
  ) satisfies Prisma.mall_platform_review_snapshotsOrderByWithRelationInput;
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
                  product: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      base_price: true,
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
                          parentCategory: true,
                          name: true,
                          description: true,
                          created_at: true,
                          updated_at: true,
                          deleted_at: true,
                        },
                      },
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
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
                  parentCategory: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
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
  const total = await MyGlobal.prisma.mall_platform_review_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (snapshot) => ({
      id: snapshot.id,
      review: {
        id: snapshot.review.id,
        customer: {
          id: snapshot.review.customer.id,
          email: snapshot.review.customer.email,
          status: snapshot.review.customer.status,
          created_at: toISOStringSafe(snapshot.review.customer.created_at),
          updated_at: toISOStringSafe(snapshot.review.customer.updated_at),
          deleted_at:
            snapshot.review.customer.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.review.customer.deleted_at),
        },
        orderItem: {
          id: snapshot.review.orderItem.id,
          quantity: snapshot.review.orderItem.quantity,
          status: snapshot.review.orderItem.status,
          order: {
            id: snapshot.review.orderItem.order.id,
            orderNumber: snapshot.review.orderItem.order.order_number,
            status: snapshot.review.orderItem.order.status,
            totalAmount: snapshot.review.orderItem.order.total_amount,
            createdAt: toISOStringSafe(
              snapshot.review.orderItem.order.created_at,
            ),
          },
          productVariant: {
            id: snapshot.review.orderItem.productVariant.id,
            skuCode: snapshot.review.orderItem.productVariant.sku_code,
            optionValues:
              snapshot.review.orderItem.productVariant.option_values,
            priceOverride:
              snapshot.review.orderItem.productVariant.price_override,
            isActive: snapshot.review.orderItem.productVariant.is_active,
            product: {
              id: snapshot.review.orderItem.productVariant.product.id,
              name: snapshot.review.orderItem.productVariant.product.name,
              description:
                snapshot.review.orderItem.productVariant.product.description,
              basePrice:
                snapshot.review.orderItem.productVariant.product.base_price,
              sellerAccount: {
                id: snapshot.review.orderItem.productVariant.product
                  .sellerAccount.id,
                email:
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .email,
                approvalStatus:
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .approval_status,
                rejectionReason:
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .rejection_reason,
                suspendedAt:
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .suspended_at === null
                    ? null
                    : toISOStringSafe(
                        snapshot.review.orderItem.productVariant.product
                          .sellerAccount.suspended_at,
                      ),
                deletedAt:
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .deleted_at === null
                    ? null
                    : toISOStringSafe(
                        snapshot.review.orderItem.productVariant.product
                          .sellerAccount.deleted_at,
                      ),
                createdAt: toISOStringSafe(
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .created_at,
                ),
                updatedAt: toISOStringSafe(
                  snapshot.review.orderItem.productVariant.product.sellerAccount
                    .updated_at,
                ),
              },
              category:
                snapshot.review.orderItem.productVariant.product.category ===
                null
                  ? null
                  : {
                      id: snapshot.review.orderItem.productVariant.product
                        .category.id,
                      parentCategory: null,
                      name: snapshot.review.orderItem.productVariant.product
                        .category.name,
                      description:
                        snapshot.review.orderItem.productVariant.product
                          .category.description,
                      createdAt: toISOStringSafe(
                        snapshot.review.orderItem.productVariant.product
                          .category.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        snapshot.review.orderItem.productVariant.product
                          .category.updated_at,
                      ),
                      deletedAt:
                        snapshot.review.orderItem.productVariant.product
                          .category.deleted_at === null
                          ? null
                          : toISOStringSafe(
                              snapshot.review.orderItem.productVariant.product
                                .category.deleted_at,
                            ),
                    },
              createdAt: toISOStringSafe(
                snapshot.review.orderItem.productVariant.product.created_at,
              ),
              updatedAt: toISOStringSafe(
                snapshot.review.orderItem.productVariant.product.updated_at,
              ),
              deletedAt:
                snapshot.review.orderItem.productVariant.product.deleted_at ===
                null
                  ? null
                  : toISOStringSafe(
                      snapshot.review.orderItem.productVariant.product
                        .deleted_at,
                    ),
            },
            createdAt: toISOStringSafe(
              snapshot.review.orderItem.productVariant.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.review.orderItem.productVariant.updated_at,
            ),
            deletedAt:
              snapshot.review.orderItem.productVariant.deleted_at === null
                ? null
                : toISOStringSafe(
                    snapshot.review.orderItem.productVariant.deleted_at,
                  ),
          },
          seller: {
            id: snapshot.review.orderItem.seller.id,
            email: snapshot.review.orderItem.seller.email,
            status: snapshot.review.orderItem.seller.status,
            rejectionReason: snapshot.review.orderItem.seller.rejection_reason,
            createdAt: toISOStringSafe(
              snapshot.review.orderItem.seller.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.review.orderItem.seller.updated_at,
            ),
            deletedAt:
              snapshot.review.orderItem.seller.deleted_at === null
                ? null
                : toISOStringSafe(snapshot.review.orderItem.seller.deleted_at),
          },
          created_at: toISOStringSafe(snapshot.review.orderItem.created_at),
          updated_at: toISOStringSafe(snapshot.review.orderItem.updated_at),
          deleted_at:
            snapshot.review.orderItem.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.review.orderItem.deleted_at),
        },
        product: {
          id: snapshot.review.product.id,
          name: snapshot.review.product.name,
          description: snapshot.review.product.description,
          basePrice: snapshot.review.product.base_price,
          sellerAccount: {
            id: snapshot.review.product.sellerAccount.id,
            email: snapshot.review.product.sellerAccount.email,
            approvalStatus:
              snapshot.review.product.sellerAccount.approval_status,
            rejectionReason:
              snapshot.review.product.sellerAccount.rejection_reason,
            suspendedAt:
              snapshot.review.product.sellerAccount.suspended_at === null
                ? null
                : toISOStringSafe(
                    snapshot.review.product.sellerAccount.suspended_at,
                  ),
            deletedAt:
              snapshot.review.product.sellerAccount.deleted_at === null
                ? null
                : toISOStringSafe(
                    snapshot.review.product.sellerAccount.deleted_at,
                  ),
            createdAt: toISOStringSafe(
              snapshot.review.product.sellerAccount.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.review.product.sellerAccount.updated_at,
            ),
          },
          category:
            snapshot.review.product.category === null
              ? null
              : {
                  id: snapshot.review.product.category.id,
                  parentCategory: null,
                  name: snapshot.review.product.category.name,
                  description: snapshot.review.product.category.description,
                  createdAt: toISOStringSafe(
                    snapshot.review.product.category.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    snapshot.review.product.category.updated_at,
                  ),
                  deletedAt:
                    snapshot.review.product.category.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          snapshot.review.product.category.deleted_at,
                        ),
                },
          createdAt: toISOStringSafe(snapshot.review.product.created_at),
          updatedAt: toISOStringSafe(snapshot.review.product.updated_at),
          deletedAt:
            snapshot.review.product.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.review.product.deleted_at),
        },
        rating: snapshot.review.rating,
        content: snapshot.review.content,
        createdAt: toISOStringSafe(snapshot.review.created_at),
        updatedAt: toISOStringSafe(snapshot.review.updated_at),
        deletedAt:
          snapshot.review.deleted_at === null
            ? null
            : toISOStringSafe(snapshot.review.deleted_at),
      },
      customer: {
        id: snapshot.customer.id,
        email: snapshot.customer.email,
        status: snapshot.customer.status,
        created_at: toISOStringSafe(snapshot.customer.created_at),
        updated_at: toISOStringSafe(snapshot.customer.updated_at),
        deleted_at:
          snapshot.customer.deleted_at === null
            ? null
            : toISOStringSafe(snapshot.customer.deleted_at),
      },
      snapshotAction: snapshot.snapshot_action,
      rating: snapshot.rating,
      content: snapshot.content,
      isDeleted: snapshot.is_deleted,
      createdAt: toISOStringSafe(snapshot.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
