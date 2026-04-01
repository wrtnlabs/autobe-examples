import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function getMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
      },
      select: {
        id: true,
        mall_platform_order_item_id: true,
        reviewer_id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_result: true,
        reviewer_note: true,
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
                  },
                },
              },
            },
          },
        },
        reviewer: {
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
  if (cancellationRequest.orderItem.id !== props.orderItemId) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: cancellationRequest.id,
    orderItem: {
      id: cancellationRequest.orderItem.id,
      quantity: cancellationRequest.orderItem.quantity,
      status: cancellationRequest.orderItem.status,
      order: {
        id: cancellationRequest.orderItem.order.id,
        orderNumber: cancellationRequest.orderItem.order.order_number,
        status: cancellationRequest.orderItem.order.status,
        totalAmount: cancellationRequest.orderItem.order.total_amount,
        createdAt: toISOStringSafe(
          cancellationRequest.orderItem.order.created_at,
        ),
      } satisfies IMallPlatformOrder.ISummary,
      productVariant: {
        id: cancellationRequest.orderItem.productVariant.id,
        skuCode: cancellationRequest.orderItem.productVariant.sku_code,
        optionValues:
          cancellationRequest.orderItem.productVariant.option_values,
        priceOverride:
          cancellationRequest.orderItem.productVariant.price_override,
        isActive: cancellationRequest.orderItem.productVariant.is_active,
        product: {
          id: cancellationRequest.orderItem.productVariant.product.id,
          name: cancellationRequest.orderItem.productVariant.product.name,
          description:
            cancellationRequest.orderItem.productVariant.product.description,
          basePrice:
            cancellationRequest.orderItem.productVariant.product.base_price,
          sellerAccount: {
            id: cancellationRequest.orderItem.productVariant.product
              .sellerAccount.id,
            email:
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .email,
            approvalStatus:
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .approval_status,
            rejectionReason:
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .rejection_reason,
            suspendedAt:
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .suspended_at === null
                ? null
                : toISOStringSafe(
                    cancellationRequest.orderItem.productVariant.product
                      .sellerAccount.suspended_at,
                  ),
            deletedAt:
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .deleted_at === null
                ? null
                : toISOStringSafe(
                    cancellationRequest.orderItem.productVariant.product
                      .sellerAccount.deleted_at,
                  ),
            createdAt: toISOStringSafe(
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .created_at,
            ),
            updatedAt: toISOStringSafe(
              cancellationRequest.orderItem.productVariant.product.sellerAccount
                .updated_at,
            ),
          } satisfies IMallPlatformSellerAccount.ISummary,
          category:
            cancellationRequest.orderItem.productVariant.product.category ===
            null
              ? null
              : ({
                  id: cancellationRequest.orderItem.productVariant.product
                    .category.id,
                  parentCategory:
                    cancellationRequest.orderItem.productVariant.product
                      .category.parentCategory === null
                      ? null
                      : ({
                          id: cancellationRequest.orderItem.productVariant
                            .product.category.parentCategory.id,
                          parentCategory: null,
                          name: cancellationRequest.orderItem.productVariant
                            .product.category.parentCategory.name,
                          description:
                            cancellationRequest.orderItem.productVariant.product
                              .category.parentCategory.description,
                          createdAt: toISOStringSafe(
                            cancellationRequest.orderItem.productVariant.product
                              .category.parentCategory.created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            cancellationRequest.orderItem.productVariant.product
                              .category.parentCategory.updated_at,
                          ),
                          deletedAt:
                            cancellationRequest.orderItem.productVariant.product
                              .category.parentCategory.deleted_at === null
                              ? null
                              : toISOStringSafe(
                                  cancellationRequest.orderItem.productVariant
                                    .product.category.parentCategory.deleted_at,
                                ),
                        } satisfies IMallPlatformCategory.ISummary),
                  name: cancellationRequest.orderItem.productVariant.product
                    .category.name,
                  description:
                    cancellationRequest.orderItem.productVariant.product
                      .category.description,
                  createdAt: toISOStringSafe(
                    cancellationRequest.orderItem.productVariant.product
                      .category.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    cancellationRequest.orderItem.productVariant.product
                      .category.updated_at,
                  ),
                  deletedAt:
                    cancellationRequest.orderItem.productVariant.product
                      .category.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          cancellationRequest.orderItem.productVariant.product
                            .category.deleted_at,
                        ),
                } satisfies IMallPlatformCategory.ISummary),
          createdAt: toISOStringSafe(
            cancellationRequest.orderItem.productVariant.product.created_at,
          ),
          updatedAt: toISOStringSafe(
            cancellationRequest.orderItem.productVariant.product.updated_at,
          ),
          deletedAt:
            cancellationRequest.orderItem.productVariant.product.deleted_at ===
            null
              ? null
              : toISOStringSafe(
                  cancellationRequest.orderItem.productVariant.product
                    .deleted_at,
                ),
        } satisfies IMallPlatformProduct.ISummary,
        createdAt: toISOStringSafe(
          cancellationRequest.orderItem.productVariant.created_at,
        ),
        updatedAt: toISOStringSafe(
          cancellationRequest.orderItem.productVariant.updated_at,
        ),
        deletedAt:
          cancellationRequest.orderItem.productVariant.deleted_at === null
            ? null
            : toISOStringSafe(
                cancellationRequest.orderItem.productVariant.deleted_at,
              ),
      } satisfies IMallPlatformProductVariant.ISummary,
      seller: {
        id: cancellationRequest.orderItem.productVariant.product.sellerAccount
          .id,
        email:
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .email,
        status:
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .approval_status,
        rejectionReason:
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .rejection_reason,
        createdAt: toISOStringSafe(
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .created_at,
        ),
        updatedAt: toISOStringSafe(
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .updated_at,
        ),
        deletedAt:
          cancellationRequest.orderItem.productVariant.product.sellerAccount
            .deleted_at === null
            ? null
            : toISOStringSafe(
                cancellationRequest.orderItem.productVariant.product
                  .sellerAccount.deleted_at,
              ),
      } satisfies IMallPlatformSeller.ISummary,
      created_at: toISOStringSafe(cancellationRequest.orderItem.created_at),
      updated_at: toISOStringSafe(cancellationRequest.orderItem.updated_at),
      deleted_at:
        cancellationRequest.orderItem.deleted_at === null
          ? null
          : toISOStringSafe(cancellationRequest.orderItem.deleted_at),
    } satisfies IMallPlatformOrderItem.ISummary,
    reviewer:
      cancellationRequest.reviewer === null
        ? null
        : ({
            id: cancellationRequest.reviewer.id,
            email: cancellationRequest.reviewer.email,
            grade: cancellationRequest.reviewer.grade,
            status: cancellationRequest.reviewer.status,
            createdAt: toISOStringSafe(cancellationRequest.reviewer.created_at),
            updatedAt: toISOStringSafe(cancellationRequest.reviewer.updated_at),
            deletedAt:
              cancellationRequest.reviewer.deleted_at === null
                ? null
                : toISOStringSafe(cancellationRequest.reviewer.deleted_at),
          } satisfies IMallPlatformAdministrator.ISummary),
    reason: cancellationRequest.reason,
    status: cancellationRequest.status,
    reviewedAt:
      cancellationRequest.reviewed_at === null
        ? null
        : toISOStringSafe(cancellationRequest.reviewed_at),
    reviewResult: cancellationRequest.review_result,
    reviewerNote: cancellationRequest.reviewer_note,
    createdAt: toISOStringSafe(cancellationRequest.created_at),
    updatedAt: toISOStringSafe(cancellationRequest.updated_at),
    deletedAt:
      cancellationRequest.deleted_at === null
        ? null
        : toISOStringSafe(cancellationRequest.deleted_at),
  } satisfies IMallPlatformCancellationRequest;
}
