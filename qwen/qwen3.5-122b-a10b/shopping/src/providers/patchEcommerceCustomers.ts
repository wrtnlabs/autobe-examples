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
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomers(props: {
  body: IEcommerceCustomer.IRequest;
}): Promise<IPageIEcommerceCustomer.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = props.body.offset ?? (page - 1) * limit;
  // Build where clause
  const where: Prisma.ecommerce_customersWhereInput = {
    ...(props.body.status === "deleted"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name, mode: "insensitive" },
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.created_at_gte && {
      created_at: { gte: props.body.created_at_gte },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: props.body.created_at_lte },
    }),
  } satisfies Prisma.ecommerce_customersWhereInput;
  // Build order by
  const orderBy: Prisma.ecommerce_customersOrderByWithRelationInput = {
    [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "desc",
  } satisfies Prisma.ecommerce_customersOrderByWithRelationInput;
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_customers.count({ where });
  // Get records
  const records = await MyGlobal.prisma.ecommerce_customers.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    ...EcommerceCustomerAtSummaryTransformer.select(),
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceCustomerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIEcommerceCustomer.ISummary;
}
