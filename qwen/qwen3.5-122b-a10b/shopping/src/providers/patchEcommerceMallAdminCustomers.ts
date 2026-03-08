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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause conditions
  const conditions: Prisma.ecommerce_mall_customersWhereInput[] = [
    { deleted_at: null },
  ];
  // Search filter (OR across email, display_name, phone_number)
  if (props.body.search) {
    conditions.push({
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { phone_number: { contains: props.body.search, mode: "insensitive" } },
      ],
    });
  }
  // Exact match filters
  if (props.body.email) {
    conditions.push({ email: props.body.email });
  }
  if (props.body.displayName) {
    conditions.push({ display_name: props.body.displayName });
  }
  if (props.body.phoneNumber) {
    conditions.push({ phone_number: props.body.phoneNumber });
  }
  if (props.body.accountStatus) {
    conditions.push({ account_status: props.body.accountStatus });
  }
  // Date range filters
  if (props.body.createdAtFrom || props.body.createdAtTo) {
    conditions.push({
      created_at: {
        ...(props.body.createdAtFrom && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    });
  }
  if (props.body.updatedAtFrom || props.body.updatedAtTo) {
    conditions.push({
      updated_at: {
        ...(props.body.updatedAtFrom && {
          gte: new Date(props.body.updatedAtFrom),
        }),
        ...(props.body.updatedAtTo && {
          lte: new Date(props.body.updatedAtTo),
        }),
      },
    });
  }
  const whereInput: Prisma.ecommerce_mall_customersWhereInput =
    conditions.length === 1 ? conditions[0] : { AND: conditions };
  // Build order by clause
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = typia.assert<"asc" | "desc">(
    props.body.sortOrder ?? "desc",
  );
  const orderByInput: Prisma.ecommerce_mall_customersOrderByWithRelationInput =
    sortBy === "email"
      ? { email: sortOrder }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder }
        : { created_at: sortOrder };
  // Fetch paginated data
  const data = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  // Transform results
  const customers = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCustomerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: customers,
  } satisfies IPageIEcommerceMallCustomer.ISummary;
}
