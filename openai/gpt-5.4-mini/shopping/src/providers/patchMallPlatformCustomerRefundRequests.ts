import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
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

export async function patchMallPlatformCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IMallPlatformRefundRequest.IRequest;
}): Promise<IPageIMallPlatformRefundRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const current: number = page;
  const skip: number = (current - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const orderBy = (() => {
    const direction: "asc" | "desc" = props.body.order ?? "desc";
    switch (props.body.sort) {
      case "status":
        return {
          status: direction,
        } satisfies Prisma.mall_platform_refund_requestsOrderByWithRelationInput;
      case "reviewedAt":
        return {
          reviewed_at: direction,
        } satisfies Prisma.mall_platform_refund_requestsOrderByWithRelationInput;
      case "updatedAt":
        return {
          updated_at: direction,
        } satisfies Prisma.mall_platform_refund_requestsOrderByWithRelationInput;
      case "createdAt":
      default:
        return {
          created_at: direction,
        } satisfies Prisma.mall_platform_refund_requestsOrderByWithRelationInput;
    }
  })();
  const where = {
    deleted_at: null,
    mall_platform_customer_id: props.customer.id,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.orderItemId !== undefined
      ? { mall_platform_order_item_id: props.body.orderItemId }
      : {}),
    ...(props.body.sellerId !== undefined
      ? { mall_platform_seller_id: props.body.sellerId }
      : {}),
    ...(props.body.administratorId !== undefined
      ? { mall_platform_administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.hasReviewedAt === true
      ? { reviewed_at: { not: null } }
      : props.body.hasReviewedAt === false
        ? { reviewed_at: null }
        : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" } },
            { review_note: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.mall_platform_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
  });
  const total = await MyGlobal.prisma.mall_platform_refund_requests.count({
    where,
  });
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      orderItem: {
        id: item.orderItem.id,
        quantity: item.orderItem.quantity,
        status: item.orderItem.status,
        order: {
          id: item.orderItem.order.id,
          orderNumber: item.orderItem.order.order_number,
          status: item.orderItem.order.status,
          totalAmount: item.orderItem.order.total_amount,
          createdAt: item.orderItem.order.created_at.toISOString(),
        },
        productVariant: {
          id: item.orderItem.productVariant.id,
          skuCode: item.orderItem.productVariant.sku_code,
          optionValues: item.orderItem.productVariant.option_values,
          priceOverride: item.orderItem.productVariant.price_override,
          isActive: item.orderItem.productVariant.is_active,
          product: {
            id: item.orderItem.productVariant.product.id,
            name: item.orderItem.productVariant.product.name,
            description: item.orderItem.productVariant.product.description,
            basePrice: item.orderItem.productVariant.product.base_price,
            sellerAccount: {
              id: item.orderItem.productVariant.product.sellerAccount.id,
              email: item.orderItem.productVariant.product.sellerAccount.email,
              approvalStatus:
                item.orderItem.productVariant.product.sellerAccount
                  .approval_status,
              rejectionReason:
                item.orderItem.productVariant.product.sellerAccount
                  .rejection_reason,
              suspendedAt:
                item.orderItem.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                null,
              deletedAt:
                item.orderItem.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                null,
              createdAt:
                item.orderItem.productVariant.product.sellerAccount.created_at.toISOString(),
              updatedAt:
                item.orderItem.productVariant.product.sellerAccount.updated_at.toISOString(),
            } satisfies IMallPlatformSellerAccount.ISummary,
            category:
              item.orderItem.productVariant.product.category === null
                ? null
                : ({
                    id: item.orderItem.productVariant.product.category.id,
                    parentCategory:
                      item.orderItem.productVariant.product.category
                        .parentCategory === null
                        ? null
                        : ({
                            id: item.orderItem.productVariant.product.category
                              .parentCategory.id,
                            parentCategory: null,
                            name: item.orderItem.productVariant.product.category
                              .parentCategory.name,
                            description:
                              item.orderItem.productVariant.product.category
                                .parentCategory.description,
                            createdAt:
                              item.orderItem.productVariant.product.category.parentCategory.created_at.toISOString(),
                            updatedAt:
                              item.orderItem.productVariant.product.category.parentCategory.updated_at.toISOString(),
                            deletedAt:
                              item.orderItem.productVariant.product.category.parentCategory.deleted_at?.toISOString() ??
                              null,
                          } satisfies IMallPlatformCategory.ISummary),
                    name: item.orderItem.productVariant.product.category.name,
                    description:
                      item.orderItem.productVariant.product.category
                        .description,
                    createdAt:
                      item.orderItem.productVariant.product.category.created_at.toISOString(),
                    updatedAt:
                      item.orderItem.productVariant.product.category.updated_at.toISOString(),
                    deletedAt:
                      item.orderItem.productVariant.product.category.deleted_at?.toISOString() ??
                      null,
                  } satisfies IMallPlatformCategory.ISummary),
            createdAt:
              item.orderItem.productVariant.product.created_at.toISOString(),
            updatedAt:
              item.orderItem.productVariant.product.updated_at.toISOString(),
            deletedAt:
              item.orderItem.productVariant.product.deleted_at?.toISOString() ??
              null,
          } satisfies IMallPlatformProduct.ISummary,
          createdAt: item.orderItem.productVariant.created_at.toISOString(),
          updatedAt: item.orderItem.productVariant.updated_at.toISOString(),
          deletedAt:
            item.orderItem.productVariant.deleted_at?.toISOString() ?? null,
        } satisfies IMallPlatformProductVariant.ISummary,
        seller: {
          id: item.orderItem.seller.id,
          email: item.orderItem.seller.email,
          status: item.orderItem.seller.status,
          rejectionReason: item.orderItem.seller.rejection_reason,
          createdAt: item.orderItem.seller.created_at.toISOString(),
          updatedAt: item.orderItem.seller.updated_at.toISOString(),
          deletedAt: item.orderItem.seller.deleted_at?.toISOString() ?? null,
        } satisfies IMallPlatformSeller.ISummary,
        created_at: item.orderItem.created_at.toISOString(),
        updated_at: item.orderItem.updated_at.toISOString(),
        deleted_at: item.orderItem.deleted_at?.toISOString() ?? null,
      } satisfies IMallPlatformOrderItem.ISummary,
      customer: {
        id: item.customer.id,
        email: item.customer.email,
        status: item.customer.status,
        created_at: item.customer.created_at.toISOString(),
        updated_at: item.customer.updated_at.toISOString(),
        deleted_at: item.customer.deleted_at?.toISOString() ?? null,
      } satisfies IMallPlatformCustomer.ISummary,
      seller: {
        id: item.seller.id,
        email: item.seller.email,
        status: item.seller.status,
        rejectionReason: item.seller.rejection_reason,
        createdAt: item.seller.created_at.toISOString(),
        updatedAt: item.seller.updated_at.toISOString(),
        deletedAt: item.seller.deleted_at?.toISOString() ?? null,
      } satisfies IMallPlatformSeller.ISummary,
      administrator:
        item.administrator === null
          ? null
          : ({
              id: item.administrator.id,
              email: item.administrator.email,
              grade: item.administrator.grade,
              status: item.administrator.status,
              createdAt: item.administrator.created_at.toISOString(),
              updatedAt: item.administrator.updated_at.toISOString(),
              deletedAt: item.administrator.deleted_at?.toISOString() ?? null,
            } satisfies IMallPlatformAdministrator.ISummary),
      reason: item.reason,
      status: item.status,
      reviewedAt: item.reviewed_at?.toISOString() ?? null,
      reviewNote: item.review_note,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      deletedAt: item.deleted_at?.toISOString() ?? null,
    })),
  } satisfies IPageIMallPlatformRefundRequest.ISummary;
}
