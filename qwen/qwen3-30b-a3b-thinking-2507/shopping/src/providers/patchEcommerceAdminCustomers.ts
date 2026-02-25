import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
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

export async function patchEcommerceAdminCustomers(props: {
  admin: AdminPayload;
  body: IEcommerceCustomer.IRequest;
}): Promise<IPageIEcommerceCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_customersWhereInput = {
    deleted_at: null,
  };
  // Status mapping from business rules:
  // active = (email_verified AND NOT is_suspended)
  // pending = (NOT email_verified)
  // suspended = is_suspended
  if (props.body.status) {
    switch (props.body.status) {
      case "active":
        where.email_verified = true;
        where.is_suspended = false;
        break;
      case "pending":
        where.email_verified = false;
        break;
      case "suspended":
        where.is_suspended = true;
        break;
    }
  }
  // Email filter
  if (props.body.email) {
    where.email = { equals: props.body.email };
  }
  // Date range filter
  if (props.body.dateRange) {
    where.created_at = {
      gte: props.body.dateRange.start,
      lte: props.body.dateRange.end,
    };
  }
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_customers.count({ where });
  // Get paginated data
  const customers = await MyGlobal.prisma.ecommerce_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Transform results to summary format
  const data = await Promise.all(
    customers.map(async (customer) => {
      return {
        id: customer.id,
        email: customer.email,
        emailVerified: customer.email_verified,
        isSuspended: customer.is_suspended,
        createdAt: customer.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IEcommerceCustomer.ISummary;
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceCustomer.ISummary;
}
