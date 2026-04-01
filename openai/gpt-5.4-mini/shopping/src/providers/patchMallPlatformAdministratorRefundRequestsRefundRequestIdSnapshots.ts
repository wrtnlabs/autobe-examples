import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
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

export async function patchMallPlatformAdministratorRefundRequestsRefundRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformRefundRequestSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    mall_platform_refund_request_id: props.refundRequestId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              reviewer_note: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_refund_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        refundRequest: {
          select: {
            id: true,
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
                            parentCategory: {
                              select: {
                                id: true,
                                parentCategory: {
                                  select: {
                                    id: true,
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
            administrator: {
              select: {
                id: true,
                email: true,
                grade: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            reason: true,
            status: true,
            reviewed_at: true,
            review_note: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        snapshot_reason: true,
        status_before: true,
        status_after: true,
        reviewer_role: true,
        reviewer_note: true,
        created_at: true,
      },
    });
  const total: number =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: data.map((snapshot) => ({
      id: snapshot.id,
      refundRequest: {
        id: snapshot.refundRequest.id,
        orderItem: {
          id: snapshot.refundRequest.orderItem.id,
          quantity: snapshot.refundRequest.orderItem.quantity,
          status: snapshot.refundRequest.orderItem.status,
          order: {
            id: snapshot.refundRequest.orderItem.order.id,
            orderNumber: snapshot.refundRequest.orderItem.order.order_number,
            status: snapshot.refundRequest.orderItem.order.status,
            totalAmount: snapshot.refundRequest.orderItem.order.total_amount,
            createdAt: toISOStringSafe(
              snapshot.refundRequest.orderItem.order.created_at,
            ),
          },
          productVariant: {
            id: snapshot.refundRequest.orderItem.productVariant.id,
            skuCode: snapshot.refundRequest.orderItem.productVariant.sku_code,
            optionValues:
              snapshot.refundRequest.orderItem.productVariant.option_values,
            priceOverride:
              snapshot.refundRequest.orderItem.productVariant.price_override,
            isActive: snapshot.refundRequest.orderItem.productVariant.is_active,
            product: {
              id: snapshot.refundRequest.orderItem.productVariant.product.id,
              name: snapshot.refundRequest.orderItem.productVariant.product
                .name,
              description:
                snapshot.refundRequest.orderItem.productVariant.product
                  .description,
              basePrice:
                snapshot.refundRequest.orderItem.productVariant.product
                  .base_price,
              sellerAccount: {
                id: snapshot.refundRequest.orderItem.productVariant.product
                  .sellerAccount.id,
                email:
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.email,
                approvalStatus:
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.approval_status,
                rejectionReason:
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.rejection_reason,
                suspendedAt:
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.suspended_at === null
                    ? null
                    : toISOStringSafe(
                        snapshot.refundRequest.orderItem.productVariant.product
                          .sellerAccount.suspended_at,
                      ),
                deletedAt:
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        snapshot.refundRequest.orderItem.productVariant.product
                          .sellerAccount.deleted_at,
                      ),
                createdAt: toISOStringSafe(
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.created_at,
                ),
                updatedAt: toISOStringSafe(
                  snapshot.refundRequest.orderItem.productVariant.product
                    .sellerAccount.updated_at,
                ),
              },
              category:
                snapshot.refundRequest.orderItem.productVariant.product
                  .category === null
                  ? null
                  : {
                      id: snapshot.refundRequest.orderItem.productVariant
                        .product.category.id,
                      parentCategory:
                        snapshot.refundRequest.orderItem.productVariant.product
                          .category.parentCategory === null
                          ? null
                          : {
                              id: snapshot.refundRequest.orderItem
                                .productVariant.product.category.parentCategory
                                .id,
                              parentCategory: null,
                              name: snapshot.refundRequest.orderItem
                                .productVariant.product.category.parentCategory
                                .name,
                              description:
                                snapshot.refundRequest.orderItem.productVariant
                                  .product.category.parentCategory.description,
                              createdAt: toISOStringSafe(
                                snapshot.refundRequest.orderItem.productVariant
                                  .product.category.parentCategory.created_at,
                              ),
                              updatedAt: toISOStringSafe(
                                snapshot.refundRequest.orderItem.productVariant
                                  .product.category.parentCategory.updated_at,
                              ),
                              deletedAt:
                                snapshot.refundRequest.orderItem.productVariant
                                  .product.category.parentCategory
                                  .deleted_at === null
                                  ? null
                                  : toISOStringSafe(
                                      snapshot.refundRequest.orderItem
                                        .productVariant.product.category
                                        .parentCategory.deleted_at,
                                    ),
                            },
                      name: snapshot.refundRequest.orderItem.productVariant
                        .product.category.name,
                      description:
                        snapshot.refundRequest.orderItem.productVariant.product
                          .category.description,
                      createdAt: toISOStringSafe(
                        snapshot.refundRequest.orderItem.productVariant.product
                          .category.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        snapshot.refundRequest.orderItem.productVariant.product
                          .category.updated_at,
                      ),
                      deletedAt:
                        snapshot.refundRequest.orderItem.productVariant.product
                          .category.deleted_at === null
                          ? null
                          : toISOStringSafe(
                              snapshot.refundRequest.orderItem.productVariant
                                .product.category.deleted_at,
                            ),
                    },
              createdAt: toISOStringSafe(
                snapshot.refundRequest.orderItem.productVariant.product
                  .created_at,
              ),
              updatedAt: toISOStringSafe(
                snapshot.refundRequest.orderItem.productVariant.product
                  .updated_at,
              ),
              deletedAt:
                snapshot.refundRequest.orderItem.productVariant.product
                  .deleted_at === null
                  ? null
                  : toISOStringSafe(
                      snapshot.refundRequest.orderItem.productVariant.product
                        .deleted_at,
                    ),
            },
            createdAt: toISOStringSafe(
              snapshot.refundRequest.orderItem.productVariant.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.refundRequest.orderItem.productVariant.updated_at,
            ),
            deletedAt:
              snapshot.refundRequest.orderItem.productVariant.deleted_at ===
              null
                ? null
                : toISOStringSafe(
                    snapshot.refundRequest.orderItem.productVariant.deleted_at,
                  ),
          },
          seller: {
            id: snapshot.refundRequest.orderItem.seller.id,
            email: snapshot.refundRequest.orderItem.seller.email,
            status: snapshot.refundRequest.orderItem.seller.status,
            rejectionReason:
              snapshot.refundRequest.orderItem.seller.rejection_reason,
            createdAt: toISOStringSafe(
              snapshot.refundRequest.orderItem.seller.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.refundRequest.orderItem.seller.updated_at,
            ),
            deletedAt:
              snapshot.refundRequest.orderItem.seller.deleted_at === null
                ? null
                : toISOStringSafe(
                    snapshot.refundRequest.orderItem.seller.deleted_at,
                  ),
          },
          created_at: toISOStringSafe(
            snapshot.refundRequest.orderItem.created_at,
          ),
          updated_at: toISOStringSafe(
            snapshot.refundRequest.orderItem.updated_at,
          ),
          deleted_at:
            snapshot.refundRequest.orderItem.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.refundRequest.orderItem.deleted_at),
        },
        customer: {
          id: snapshot.refundRequest.customer.id,
          email: snapshot.refundRequest.customer.email,
          status: snapshot.refundRequest.customer.status,
          created_at: toISOStringSafe(
            snapshot.refundRequest.customer.created_at,
          ),
          updated_at: toISOStringSafe(
            snapshot.refundRequest.customer.updated_at,
          ),
          deleted_at:
            snapshot.refundRequest.customer.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.refundRequest.customer.deleted_at),
        },
        seller: {
          id: snapshot.refundRequest.seller.id,
          email: snapshot.refundRequest.seller.email,
          status: snapshot.refundRequest.seller.status,
          rejectionReason: snapshot.refundRequest.seller.rejection_reason,
          createdAt: toISOStringSafe(snapshot.refundRequest.seller.created_at),
          updatedAt: toISOStringSafe(snapshot.refundRequest.seller.updated_at),
          deletedAt:
            snapshot.refundRequest.seller.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.refundRequest.seller.deleted_at),
        },
        administrator:
          snapshot.refundRequest.administrator === null
            ? null
            : {
                id: snapshot.refundRequest.administrator.id,
                email: snapshot.refundRequest.administrator.email,
                grade: snapshot.refundRequest.administrator.grade,
                status: snapshot.refundRequest.administrator.status,
                createdAt: toISOStringSafe(
                  snapshot.refundRequest.administrator.created_at,
                ),
                updatedAt: toISOStringSafe(
                  snapshot.refundRequest.administrator.updated_at,
                ),
                deletedAt:
                  snapshot.refundRequest.administrator.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        snapshot.refundRequest.administrator.deleted_at,
                      ),
              },
        reason: snapshot.refundRequest.reason,
        status: snapshot.refundRequest.status,
        reviewedAt:
          snapshot.refundRequest.reviewed_at === null
            ? null
            : toISOStringSafe(snapshot.refundRequest.reviewed_at),
        reviewNote: snapshot.refundRequest.review_note,
        createdAt: toISOStringSafe(snapshot.refundRequest.created_at),
        updatedAt: toISOStringSafe(snapshot.refundRequest.updated_at),
        deletedAt:
          snapshot.refundRequest.deleted_at === null
            ? null
            : toISOStringSafe(snapshot.refundRequest.deleted_at),
      },
      snapshotReason: snapshot.snapshot_reason,
      statusBefore: snapshot.status_before,
      statusAfter: snapshot.status_after,
      reviewerRole: snapshot.reviewer_role,
      reviewerNote: snapshot.reviewer_note,
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
