import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
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

export async function patchMallPlatformAdministratorSellerAccounts(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSellerAccount.IRequest;
}): Promise<IPageIMallPlatformSellerAccount.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const sort: string = props.body.sort ?? "created_at_desc";
  const orderBy: Prisma.mall_platform_seller_accountsOrderByWithRelationInput =
    (() => {
      switch (sort) {
        case "created_at_desc":
          return { created_at: "desc" };
        case "created_at_asc":
          return { created_at: "asc" };
        case "email_asc":
          return { email: "asc" };
        case "email_desc":
          return { email: "desc" };
        case "approval_status_asc":
          return { approval_status: "asc" };
        case "approval_status_desc":
          return { approval_status: "desc" };
        default:
          throw new HttpException("Unsupported sort option", 400);
      }
    })();
  const where = {
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            { email: { contains: props.body.search, mode: "insensitive" } },
            {
              rejection_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.approvalStatus !== undefined
      ? { approval_status: props.body.approvalStatus }
      : {}),
  } satisfies Prisma.mall_platform_seller_accountsWhereInput;
  const records = await MyGlobal.prisma.mall_platform_seller_accounts.findMany({
    where,
    orderBy: [orderBy, { id: "asc" }],
    skip: (page - 1) * limit,
    take: limit,
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
  });
  const total = await MyGlobal.prisma.mall_platform_seller_accounts.count({
    where,
  });
  return {
    data: records.map((record) => ({
      id: record.id,
      email: record.email,
      approvalStatus: record.approval_status,
      rejectionReason: record.rejection_reason,
      suspendedAt:
        record.suspended_at === null ? null : record.suspended_at.toISOString(),
      deletedAt:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIMallPlatformSellerAccount.ISummary;
}
