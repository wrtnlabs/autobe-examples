import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerApprovalRequest";
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

export async function patchMallPlatformAdministratorSellerApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSellerApprovalRequest.IRequest;
}): Promise<IPageIMallPlatformSellerApprovalRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const reviewedAtFilter:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined =
    props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
      ? {
          ...(props.body.reviewedAtFrom !== undefined &&
          props.body.reviewedAtFrom !== null
            ? { gte: props.body.reviewedAtFrom }
            : {}),
          ...(props.body.reviewedAtTo !== undefined &&
          props.body.reviewedAtTo !== null
            ? { lte: props.body.reviewedAtTo }
            : {}),
        }
      : undefined;
  const createdAtFilter:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined &&
          props.body.createdAtFrom !== null
            ? { gte: props.body.createdAtFrom }
            : {}),
          ...(props.body.createdAtTo !== undefined &&
          props.body.createdAtTo !== null
            ? { lte: props.body.createdAtTo }
            : {}),
        }
      : undefined;
  const where: Prisma.mall_platform_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.sellerId !== undefined
      ? { mall_platform_seller_id: props.body.sellerId }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(reviewedAtFilter !== undefined
      ? { reviewed_at: reviewedAtFilter }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
  };
  const orderBy: Prisma.mall_platform_seller_approval_requestsOrderByWithRelationInput[] =
    props.body.status === undefined
      ? [{ status: "asc" }, { created_at: "desc" }, { id: "desc" }]
      : [{ created_at: "desc" }, { id: "desc" }];
  const records =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
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
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  const recordsCount: number =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.count({
      where,
    });
  return {
    data: records.map(
      (record) =>
        ({
          id: record.id,
          seller: {
            id: record.seller.id,
            email: record.seller.email,
            status: record.seller.status,
            rejectionReason: record.seller.rejection_reason,
            createdAt: record.seller.created_at.toISOString(),
            updatedAt: record.seller.updated_at.toISOString(),
            deletedAt: record.seller.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformSeller.ISummary,
          status: record.status,
          rejectionReason: record.rejection_reason,
          reviewedAt: record.reviewed_at?.toISOString() ?? null,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
        }) satisfies IMallPlatformSellerApprovalRequest.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIMallPlatformSellerApprovalRequest.ISummary;
}
