import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
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

export async function patchMallPlatformAdministratorAdministratorApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorApprovalRequest.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderByInput = (() => {
    if (
      props.body.sort === undefined ||
      props.body.sort === "createdAt" ||
      props.body.sort === "created_at"
    ) {
      return [
        { created_at: props.body.order ?? "desc" },
        { id: "desc" },
      ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
    }
    if (props.body.sort === "updatedAt" || props.body.sort === "updated_at") {
      return [
        { updated_at: props.body.order ?? "desc" },
        { id: "desc" },
      ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
    }
    if (props.body.sort === "status") {
      return [
        { status: props.body.order ?? "asc" },
        { created_at: "desc" },
        { id: "desc" },
      ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
    }
    if (props.body.sort === "reason") {
      return [
        { reason: props.body.order ?? "asc" },
        { created_at: "desc" },
        { id: "desc" },
      ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
    }
    if (props.body.sort === "reviewedAt" || props.body.sort === "reviewed_at") {
      return [
        { reviewed_at: props.body.order ?? "desc" },
        { id: "desc" },
      ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
    }
    throw new HttpException("Unsupported sort key", 400);
  })();
  const where = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? { reason: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.administratorId !== undefined
      ? { administrator_id: props.body.administratorId }
      : {}),
  } satisfies Prisma.mall_platform_administrator_approval_requestsWhereInput;
  const data =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: orderByInput,
        select: {
          id: true,
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
          reviewerAdministrator: {
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
          rejection_reason: true,
          reviewed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.count({
      where,
    });
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records,
    pages: Math.ceil(records / limit),
  };
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          administrator: {
            id: record.administrator.id,
            email: record.administrator.email,
            grade: record.administrator.grade,
            status: record.administrator.status,
            createdAt: toISOStringSafe(record.administrator.created_at),
            updatedAt: toISOStringSafe(record.administrator.updated_at),
            deletedAt:
              record.administrator.deleted_at === null
                ? null
                : toISOStringSafe(record.administrator.deleted_at),
          } satisfies IMallPlatformAdministrator.ISummary,
          reviewerAdministrator:
            record.reviewerAdministrator === null
              ? null
              : ({
                  id: record.reviewerAdministrator.id,
                  email: record.reviewerAdministrator.email,
                  grade: record.reviewerAdministrator.grade,
                  status: record.reviewerAdministrator.status,
                  createdAt: toISOStringSafe(
                    record.reviewerAdministrator.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    record.reviewerAdministrator.updated_at,
                  ),
                  deletedAt:
                    record.reviewerAdministrator.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          record.reviewerAdministrator.deleted_at,
                        ),
                } satisfies IMallPlatformAdministrator.ISummary),
          reason: record.reason,
          status: record.status,
          rejectionReason: record.rejection_reason,
          reviewedAt:
            record.reviewed_at === null
              ? null
              : toISOStringSafe(record.reviewed_at),
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at === null
              ? null
              : toISOStringSafe(record.deleted_at),
        }) satisfies IMallPlatformAdministratorApprovalRequest.ISummary,
    ),
    pagination,
  };
}
