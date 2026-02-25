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
  const {
    search,
    status,
    registrationDateStart,
    registrationDateEnd,
    page = 1,
    limit = 20,
  } = props.body;
  const where: Prisma.shopping_mall_customersWhereInput = {};
  if (search !== undefined && search !== null && search.trim() !== "") {
    const searchTerm = search.trim();
    where.OR = [
      { display_name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  if (status === "active") {
    where.deleted_at = null;
  } else if (status === "inactive" || status === "deleted") {
    where.deleted_at = { not: null };
  }
  if (registrationDateStart !== undefined && registrationDateStart !== null) {
    where.created_at = { gte: registrationDateStart };
  }
  if (registrationDateEnd !== undefined && registrationDateEnd !== null) {
    if (typeof where.created_at === "object" && where.created_at !== null) {
      where.created_at = { ...where.created_at, lte: registrationDateEnd };
    } else {
      where.created_at = { lte: registrationDateEnd };
    }
  }
  const pageNumber = Number.isInteger(page) && page >= 1 ? page : 1;
  const pageLimit =
    Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 20;
  const skip = (pageNumber - 1) * pageLimit;
  const total = await MyGlobal.prisma.shopping_mall_customers.count({ where });
  const records = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    skip,
    take: pageLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const data = records.map((record) => ({
    id: record.id,
    email: record.email,
    displayName: record.display_name ?? null,
    phoneNumber: record.phone_number ?? null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
  }));
  const pages = total === 0 ? 0 : Math.ceil(total / pageLimit);
  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages,
    },
    data,
  };
}
