import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallActorsCustomers(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  // Parse body as JSON string since IRequest is typed as string per DTO
  let searchCriteria: Record<string, any> = {};
  try {
    searchCriteria = JSON.parse(props.body);
  } catch (error) {
    // If invalid JSON, treat as empty search
  }

  const page = searchCriteria.page ?? 1;
  const limit = searchCriteria.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition based on search criteria
  const whereCondition = {
    deleted_at: null,
    ...(searchCriteria.email && { email: { contains: searchCriteria.email } }),
    ...(searchCriteria.firstName && {
      first_name: { contains: searchCriteria.firstName },
    }),
    ...(searchCriteria.lastName && {
      last_name: { contains: searchCriteria.lastName },
    }),
    ...(searchCriteria.status && { status: searchCriteria.status }),
    ...(searchCriteria.createdAtFrom || searchCriteria.createdAtTo
      ? {
          created_at: {
            ...(searchCriteria.createdAtFrom && {
              gte: searchCriteria.createdAtFrom,
            }),
            ...(searchCriteria.createdAtTo && {
              lte: searchCriteria.createdAtTo,
            }),
          },
        }
      : {}),
  };

  // Execute query with pagination and count
  const [customers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where: whereCondition }),
  ]);

  // Map to ISummary type with proper date formatting
  const data = customers.map((customer) => ({
    id: customer.id,
    email: customer.email,
    name: `${customer.first_name} ${customer.last_name}`,
    created_at: toISOStringSafe(customer.created_at),
    status: customer.status,
  }));

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
