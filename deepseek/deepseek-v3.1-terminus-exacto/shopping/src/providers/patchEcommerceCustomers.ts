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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceCustomers(props: {
  body: IEcommerceCustomer.IRequest;
}): Promise<IPageIEcommerceCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with optional filters
  const whereInput: Prisma.ecommerce_customersWhereInput = {
    deleted_at: null, // Exclude deleted customers
  };
  // Add email filter (exact match)
  if (props.body.email) {
    whereInput.email = props.body.email;
  }
  // Add display_name filter (partial match using trigram)
  if (props.body.display_name) {
    whereInput.display_name = {
      contains: props.body.display_name,
      mode: "insensitive" as const,
    };
  }
  // Add created_at range filter
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_customers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_customers.count({
      where: whereInput,
    }),
  ]);
  const transformedData = data.map((customer) => ({
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    display_name: customer.display_name,
    created_at: toISOStringSafe(customer.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
