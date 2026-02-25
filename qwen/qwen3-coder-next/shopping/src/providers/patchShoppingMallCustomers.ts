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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.shopping_mall_customersWhereInput = {};
  // Search filters
  if (props.body.display_name) {
    where.display_name = { contains: props.body.display_name };
  }
  if (props.body.email) {
    where.email = { contains: props.body.email };
  }
  if (props.body.phone_number) {
    where.phone_number = { contains: props.body.phone_number };
  }
  if (props.body.email_verified !== undefined) {
    where.email_verified = props.body.email_verified;
  }
  // Date range filters
  if (props.body.starts_at || props.body.ends_at) {
    where.created_at = {};
    if (props.body.starts_at) {
      const dateStart = new Date(props.body.starts_at);
      where.created_at.gte = dateStart;
    }
    if (props.body.ends_at) {
      const dateEnd = new Date(props.body.ends_at);
      where.created_at.lte = dateEnd;
    }
  }
  // Build order by clause
  const orderBy: Prisma.shopping_mall_customersOrderByWithRelationInput = {};
  if (props.body.sort_by === "created_at") {
    orderBy.created_at = props.body.sort_order === "asc" ? "asc" : "desc";
  } else if (props.body.sort_by === "updated_at") {
    orderBy.updated_at = props.body.sort_order === "asc" ? "asc" : "desc";
  } else {
    orderBy.created_at = "desc"; // Default sort
  }
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_customers.count({ where });
  // Transform to response format
  const transformedData = data.map((customer) => ({
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    display_name: customer.display_name ?? null,
    phone_number: customer.phone_number ?? null,
    email_verified: customer.email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
  }));
  // Calculate pagination metadata
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIShoppingMallCustomer.ISummary;
}
