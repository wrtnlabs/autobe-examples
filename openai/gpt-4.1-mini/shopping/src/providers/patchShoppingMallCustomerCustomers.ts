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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCustomers(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.shopping_mall_customersWhereInput = {};
  if (
    typeof props.body.search === "string" &&
    props.body.search.trim() !== ""
  ) {
    const search = props.body.search.trim();
    whereConditions.OR = [
      { display_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (props.body.status === "active") {
    whereConditions.deleted_at = null;
  } else if (
    props.body.status === "inactive" ||
    props.body.status === "deleted"
  ) {
    whereConditions.NOT = { deleted_at: null };
  }
  let filter: Prisma.DateTimeFilter = {};
  if (typeof props.body.registrationDateStart === "string") {
    filter.gte = props.body.registrationDateStart;
  }
  if (typeof props.body.registrationDateEnd === "string") {
    filter.lte = props.body.registrationDateEnd;
  }
  if (Object.keys(filter).length > 0) {
    whereConditions.created_at = filter;
  }
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where: whereConditions,
  });
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereConditions,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: customers.map((customer) => ({
      id: customer.id,
      email: customer.email,
      displayName: customer.display_name ?? null,
      phoneNumber: customer.phone_number ?? null,
      createdAt: toISOStringSafe(customer.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(customer.updated_at) as string &
        tags.Format<"date-time">,
    })),
  };
}
