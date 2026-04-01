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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformRefundRequestSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const refundRequest =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_customer_id: true,
        mall_platform_order_item_id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
                        parentCategory: true,
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
      },
    });
  if (refundRequest.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.mall_platform_refund_request_snapshotsWhereInput = {
    mall_platform_refund_request_id: props.refundRequestId,
    ...(props.body.search !== undefined && props.body.search !== ""
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
  };
  const data =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        snapshot_reason: true,
        status_before: true,
        status_after: true,
        reviewer_role: true,
        reviewer_note: true,
        created_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.count({
      where,
    });
  const pagination = {
    current: page,
    limit: limit,
    records: records,
    pages: Math.ceil(records / limit),
  } satisfies IPage.IPagination;
  return {
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          refundRequest: {
            id: refundRequest.id,
            orderItem: {
              id: refundRequest.orderItem.id,
              quantity: refundRequest.orderItem.quantity,
              status: refundRequest.orderItem.status,
              order: {
                id: refundRequest.orderItem.order.id,
                orderNumber: refundRequest.orderItem.order.order_number,
                status: refundRequest.orderItem.order.status,
                totalAmount: refundRequest.orderItem.order.total_amount,
                createdAt: toISOStringSafe(
                  refundRequest.orderItem.order.created_at,
                ),
              } satisfies IMallPlatformOrder.ISummary,
              productVariant: {
                id: refundRequest.orderItem.productVariant.id,
                skuCode: refundRequest.orderItem.productVariant.sku_code,
                optionValues:
                  refundRequest.orderItem.productVariant.option_values,
                priceOverride:
                  refundRequest.orderItem.productVariant.price_override,
                isActive: refundRequest.orderItem.productVariant.is_active,
                product: {
                  id: refundRequest.orderItem.productVariant.product.id,
                  name: refundRequest.orderItem.productVariant.product.name,
                  description:
                    refundRequest.orderItem.productVariant.product.description,
                  basePrice:
                    refundRequest.orderItem.productVariant.product.base_price,
                  sellerAccount: {
                    id: refundRequest.orderItem.productVariant.product
                      .sellerAccount.id,
                    email:
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.email,
                    approvalStatus:
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.approval_status,
                    rejectionReason:
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.rejection_reason,
                    suspendedAt:
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.suspended_at !== null
                        ? toISOStringSafe(
                            refundRequest.orderItem.productVariant.product
                              .sellerAccount.suspended_at,
                          )
                        : null,
                    deletedAt:
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.deleted_at !== null
                        ? toISOStringSafe(
                            refundRequest.orderItem.productVariant.product
                              .sellerAccount.deleted_at,
                          )
                        : null,
                    createdAt: toISOStringSafe(
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.created_at,
                    ),
                    updatedAt: toISOStringSafe(
                      refundRequest.orderItem.productVariant.product
                        .sellerAccount.updated_at,
                    ),
                  } satisfies IMallPlatformSellerAccount.ISummary,
                  category:
                    refundRequest.orderItem.productVariant.product.category ===
                    null
                      ? null
                      : ({
                          id: refundRequest.orderItem.productVariant.product
                            .category.id,
                          parentCategory: null,
                          name: refundRequest.orderItem.productVariant.product
                            .category.name,
                          description:
                            refundRequest.orderItem.productVariant.product
                              .category.description,
                          createdAt: toISOStringSafe(
                            refundRequest.orderItem.productVariant.product
                              .category.created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            refundRequest.orderItem.productVariant.product
                              .category.updated_at,
                          ),
                          deletedAt:
                            refundRequest.orderItem.productVariant.product
                              .category.deleted_at !== null
                              ? toISOStringSafe(
                                  refundRequest.orderItem.productVariant.product
                                    .category.deleted_at,
                                )
                              : null,
                        } satisfies IMallPlatformCategory.ISummary | null),
                  createdAt: toISOStringSafe(
                    refundRequest.orderItem.productVariant.product.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    refundRequest.orderItem.productVariant.product.updated_at,
                  ),
                  deletedAt:
                    refundRequest.orderItem.productVariant.product
                      .deleted_at !== null
                      ? toISOStringSafe(
                          refundRequest.orderItem.productVariant.product
                            .deleted_at,
                        )
                      : null,
                } satisfies IMallPlatformProduct.ISummary,
                createdAt: toISOStringSafe(
                  refundRequest.orderItem.productVariant.created_at,
                ),
                updatedAt: toISOStringSafe(
                  refundRequest.orderItem.productVariant.updated_at,
                ),
                deletedAt:
                  refundRequest.orderItem.productVariant.deleted_at !== null
                    ? toISOStringSafe(
                        refundRequest.orderItem.productVariant.deleted_at,
                      )
                    : null,
              } satisfies IMallPlatformProductVariant.ISummary,
              seller: {
                id: refundRequest.orderItem.seller.id,
                email: refundRequest.orderItem.seller.email,
                status: refundRequest.orderItem.seller.status,
                rejectionReason:
                  refundRequest.orderItem.seller.rejection_reason,
                createdAt: toISOStringSafe(
                  refundRequest.orderItem.seller.created_at,
                ),
                updatedAt: toISOStringSafe(
                  refundRequest.orderItem.seller.updated_at,
                ),
                deletedAt:
                  refundRequest.orderItem.seller.deleted_at !== null
                    ? toISOStringSafe(refundRequest.orderItem.seller.deleted_at)
                    : null,
              } satisfies IMallPlatformSeller.ISummary,
              created_at: toISOStringSafe(refundRequest.orderItem.created_at),
              updated_at: toISOStringSafe(refundRequest.orderItem.updated_at),
              deleted_at:
                refundRequest.orderItem.deleted_at !== null
                  ? toISOStringSafe(refundRequest.orderItem.deleted_at)
                  : null,
            } satisfies IMallPlatformOrderItem.ISummary,
            customer: {
              id: refundRequest.customer.id,
              email: refundRequest.customer.email,
              status: refundRequest.customer.status,
              created_at: toISOStringSafe(refundRequest.customer.created_at),
              updated_at: toISOStringSafe(refundRequest.customer.updated_at),
              deleted_at:
                refundRequest.customer.deleted_at !== null
                  ? toISOStringSafe(refundRequest.customer.deleted_at)
                  : null,
            } satisfies IMallPlatformCustomer.ISummary,
            seller: {
              id: refundRequest.seller.id,
              email: refundRequest.seller.email,
              status: refundRequest.seller.status,
              rejectionReason: refundRequest.seller.rejection_reason,
              createdAt: toISOStringSafe(refundRequest.seller.created_at),
              updatedAt: toISOStringSafe(refundRequest.seller.updated_at),
              deletedAt:
                refundRequest.seller.deleted_at !== null
                  ? toISOStringSafe(refundRequest.seller.deleted_at)
                  : null,
            } satisfies IMallPlatformSeller.ISummary,
            administrator:
              refundRequest.administrator === null
                ? null
                : ({
                    id: refundRequest.administrator.id,
                    email: refundRequest.administrator.email,
                    grade: refundRequest.administrator.grade,
                    status: refundRequest.administrator.status,
                    createdAt: toISOStringSafe(
                      refundRequest.administrator.created_at,
                    ),
                    updatedAt: toISOStringSafe(
                      refundRequest.administrator.updated_at,
                    ),
                    deletedAt:
                      refundRequest.administrator.deleted_at !== null
                        ? toISOStringSafe(
                            refundRequest.administrator.deleted_at,
                          )
                        : null,
                  } satisfies IMallPlatformAdministrator.ISummary),
            reason: refundRequest.reason,
            status: refundRequest.status,
            reviewedAt:
              refundRequest.reviewed_at !== null
                ? toISOStringSafe(refundRequest.reviewed_at)
                : null,
            reviewNote: refundRequest.review_note,
            createdAt: toISOStringSafe(refundRequest.created_at),
            updatedAt: toISOStringSafe(refundRequest.updated_at),
            deletedAt:
              refundRequest.deleted_at !== null
                ? toISOStringSafe(refundRequest.deleted_at)
                : null,
          } satisfies IMallPlatformRefundRequest.ISummary,
          snapshotReason: snapshot.snapshot_reason,
          statusBefore: snapshot.status_before,
          statusAfter: snapshot.status_after,
          reviewerRole: snapshot.reviewer_role,
          reviewerNote: snapshot.reviewer_note,
          createdAt: toISOStringSafe(snapshot.created_at),
        }) satisfies IMallPlatformRefundRequestSnapshot.ISummary,
    ),
    pagination,
  } satisfies IPageIMallPlatformRefundRequestSnapshot.ISummary;
}
