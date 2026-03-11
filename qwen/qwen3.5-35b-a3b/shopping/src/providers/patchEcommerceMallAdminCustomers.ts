import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
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

export async function patchEcommerceMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate limit bounds
  const validatedLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  // Build WHERE conditions
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    deleted_at: null,
  };
  // Apply email filter
  if (props.body.email !== undefined) {
    whereInput.email = props.body.email;
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    whereInput.is_banned = props.body.status as boolean;
  }
  // Apply registration date range filter
  if (props.body.registrationDateRange !== undefined) {
    whereInput.created_at = {
      gte: props.body.registrationDateRange.startAt,
      lte: props.body.registrationDateRange.endAt,
    };
  }
  // Build ORDER BY conditions
  const orderByInput = (
    props.body.sortOrder === "email"
      ? { email: (props.body.sortOrderDirection ?? "asc") as "asc" | "desc" }
      : {
          created_at: (props.body.sortOrderDirection ?? "asc") as
            | "asc"
            | "desc",
        }
  ) satisfies Prisma.ecommerce_mall_customersOrderByWithRelationInput;
  // Query customers
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customers.findMany({
      where: whereInput,
      skip: skip,
      take: validatedLimit,
      orderBy: orderByInput,
    }),
    MyGlobal.prisma.ecommerce_mall_customers.count({
      where: whereInput,
    }),
  ]);
  const totalPages =
    total / validatedLimit > 0 ? Math.ceil(total / validatedLimit) : 0;
  const currentPage =
    totalPages < 0 ? 0 : page > totalPages ? totalPages : page;
  const pagination = {
    current: currentPage,
    limit: validatedLimit,
    records: total,
    pages: totalPages,
  } satisfies IPage.IPagination;
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      email: record.email,
      display_name: "",
      is_banned: record.is_banned,
      created_at: toISOStringSafe(record.created_at),
    })) satisfies IEcommerceMallCustomer.ISummary[],
    pagination,
  };
}
