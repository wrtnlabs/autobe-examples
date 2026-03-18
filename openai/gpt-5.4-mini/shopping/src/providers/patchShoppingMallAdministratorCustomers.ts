import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function patchShoppingMallAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const currentPage: number = page < 1 ? 1 : page;
  const pageSize: number = limit < 1 ? 1 : limit;
  const skip: number = (currentPage - 1) * pageSize;
  const where: Prisma.shopping_mall_customersWhereInput = {
    ...(props.body.search !== undefined
      ? {
          email: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.accountStatus !== undefined
      ? { account_status: props.body.accountStatus }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.shopping_mall_customersOrderByWithRelationInput =
    props.body.sort === "email_asc"
      ? { email: "asc" }
      : props.body.sort === "email_desc"
        ? { email: "desc" }
        : props.body.sort === "oldest"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const rows = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    orderBy,
    skip,
    take: pageSize,
    select: {
      id: true,
      email: true,
      account_status: true,
      banned_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  const records = await MyGlobal.prisma.shopping_mall_customers.count({
    where,
  });
  return {
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      accountStatus: row.account_status,
      bannedAt: row.banned_at === null ? null : row.banned_at.toISOString(),
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
    pagination: {
      current: currentPage,
      limit: pageSize,
      records,
      pages: Math.ceil(records / pageSize),
    },
  };
}
