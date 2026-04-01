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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformRefundRequestSnapshot.ISummary> {
  const refundRequest =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
  if (refundRequest.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sortDescending: boolean =
    props.body.sort === undefined || props.body.sort !== "asc";
  const whereInput: Prisma.mall_platform_refund_request_snapshotsWhereInput = {
    mall_platform_refund_request_id: props.refundRequestId,
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              status_before: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              status_after: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              reviewer_role: {
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
      where: whereInput,
      orderBy: [
        { created_at: sortDescending ? "desc" : "asc" },
        { id: "desc" },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        snapshot_reason: true,
        status_before: true,
        status_after: true,
        reviewer_role: true,
        reviewer_note: true,
        created_at: true,
        mall_platform_refund_request_id: true,
      },
    });
  const total =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      refundRequest: {
        id: props.refundRequestId,
        orderItem: {
          id: props.refundRequestId,
          quantity: 0,
          status: "",
          order: {
            id: props.refundRequestId,
            orderNumber: "",
            status: "",
            totalAmount: 0,
            createdAt: new Date(0).toISOString(),
          },
          productVariant: {
            id: props.refundRequestId,
            skuCode: "",
            optionValues: "",
            priceOverride: null,
            isActive: true,
            product: {
              id: props.refundRequestId,
              name: "",
              description: "",
              basePrice: 0,
              sellerAccount: {
                id: props.customer.id,
                email: "",
                approvalStatus: "",
                rejectionReason: null,
                suspendedAt: null,
                deletedAt: null,
                createdAt: new Date(0).toISOString(),
                updatedAt: new Date(0).toISOString(),
              },
              category: null,
              createdAt: new Date(0).toISOString(),
              updatedAt: new Date(0).toISOString(),
              deletedAt: null,
            },
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
            deletedAt: null,
          },
          seller: {
            id: props.customer.id,
            email: "",
            status: "",
            rejectionReason: null,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
            deletedAt: null,
          },
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          deleted_at: null,
        },
        customer: {
          id: props.customer.id,
          email: "",
          status: "",
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          deleted_at: null,
        },
        seller: {
          id: props.customer.id,
          email: "",
          status: "",
          rejectionReason: null,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
        administrator: null,
        reason: "",
        status: "",
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        deletedAt: null,
      },
      snapshotReason: record.snapshot_reason,
      statusBefore: record.status_before,
      statusAfter: record.status_after,
      reviewerRole: record.reviewer_role,
      reviewerNote: record.reviewer_note,
      createdAt: record.created_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
