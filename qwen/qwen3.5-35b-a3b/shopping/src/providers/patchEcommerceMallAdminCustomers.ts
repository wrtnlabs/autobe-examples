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
  const page = Math.max(1, Number(props.body.page ?? 1));
  const limit = Math.min(Math.max(1, Number(props.body.limit ?? 20)), 100);
  const skip = (page - 1) * limit;
  const emailFilter = props.body.email
    ? { email: { contains: props.body.email } }
    : undefined;
  const statusFilter = props.body.status
    ? { status: props.body.status }
    : undefined;
  const createdAtFilter = props.body.createdAtRange
    ? {
        created_at: {
          gte: new Date(props.body.createdAtRange.gte),
          lte: new Date(props.body.createdAtRange.lte),
        },
      }
    : undefined;
  const includeDeleted = props.body.includeDeleted ?? false;
  const deletedFilter = includeDeleted ? undefined : { deleted_at: null };
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    ...((emailFilter !== undefined && emailFilter) || {}),
    ...((statusFilter !== undefined && statusFilter) || {}),
    ...((createdAtFilter !== undefined && createdAtFilter) || {}),
    ...((deletedFilter !== undefined && deletedFilter) || {}),
  };
  const validSortFields = ["id", "email", "status", "created_at"] as const;
  const validSortDirections = ["asc", "desc"] as const;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (!validSortFields.includes(sortBy as (typeof validSortFields)[number])) {
    throw new HttpException("Invalid sort field", 400);
  }
  if (
    !validSortDirections.includes(
      sortOrder as (typeof validSortDirections)[number],
    )
  ) {
    throw new HttpException("Invalid sort order", 400);
  }
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.ecommerce_mall_customersOrderByWithRelationInput;
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCustomerAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
