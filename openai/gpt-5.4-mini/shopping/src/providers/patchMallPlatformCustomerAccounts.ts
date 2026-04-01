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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerAccounts(props: {
  customer: CustomerPayload;
  body: IMallPlatformSellerAccount.IRequest;
}): Promise<IPageIMallPlatformSellerAccount.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const approvalStatus: string | undefined = props.body.approvalStatus;
  const sort: string | undefined = props.body.sort;
  const where: Prisma.mall_platform_seller_accountsWhereInput = {
    ...(search !== undefined && search.length > 0
      ? {
          OR: [{ email: { contains: search, mode: "insensitive" } }],
        }
      : {}),
    ...(approvalStatus !== undefined
      ? { approval_status: approvalStatus }
      : {}),
  };
  const orderBy: Prisma.mall_platform_seller_accountsOrderByWithRelationInput =
    sort === "email_asc"
      ? { email: "asc" }
      : sort === "email_desc"
        ? { email: "desc" }
        : sort === "created_at_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const [data, records] = await Promise.all([
    MyGlobal.prisma.mall_platform_seller_accounts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
    }),
    MyGlobal.prisma.mall_platform_seller_accounts.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      email: row.email,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
      suspendedAt:
        row.suspended_at !== null ? toISOStringSafe(row.suspended_at) : null,
      deletedAt:
        row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : null,
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
    })),
  };
}
