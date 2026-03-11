import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.approvalStatus !== undefined && {
      approval_status: props.body.approvalStatus,
    }),
    ...(props.body.isSuspended !== undefined && {
      is_suspended: props.body.isSuspended,
    }),
    ...(props.body.isBanned !== undefined && {
      is_banned: props.body.isBanned,
    }),
    ...(props.body.createdAt && {
      created_at: {
        ...(props.body.createdAt.gte && {
          gte: props.body.createdAt.gte,
        }),
        ...(props.body.createdAt.lte && {
          lte: props.body.createdAt.lte,
        }),
      },
    }),
    ...(props.body.updatedAt && {
      updated_at: {
        ...(props.body.updatedAt.gte && {
          gte: props.body.updatedAt.gte,
        }),
        ...(props.body.updatedAt.lte && {
          lte: props.body.updatedAt.lte,
        }),
      },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  // Build ORDER BY clause
  const orderByInput:
    | Prisma.ecommerce_mall_sellersOrderByWithRelationInput
    | undefined = props.body.sortBy
    ? {
        [props.body.sortBy]: props.body.sortOrder ?? "asc",
      }
    : { created_at: "desc" };
  // Execute query
  const data = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      is_suspended: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  // Transform results
  const transformedData: IEcommerceMallSeller.ISummary[] = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    email: item.email,
    approvalStatus: typia.assert<"approved" | "pending" | "rejected">(
      item.approval_status,
    ),
    rejectionReason: item.rejection_reason,
    isSuspended: item.is_suspended,
    isBanned: item.is_banned,
    createdAt: toISOStringSafe(item.created_at),
    updatedAt: toISOStringSafe(item.updated_at),
  }));
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallSeller.ISummary;
}
