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
  const email = props.body.email;
  const status = props.body.status;
  const createdAtRange = props.body.createdAtRange;
  const includeDeleted = props.body.includeDeleted ?? false;
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const validSortFields: Array<"id" | "email" | "status" | "created_at"> = [
    "id",
    "email",
    "status",
    "created_at",
  ];
  if (!validSortFields.includes(sortBy)) {
    throw new HttpException("Invalid sort field", 400);
  }
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new HttpException("Invalid sort order", 400);
  }
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    ...(email !== undefined && { email: { contains: email } }),
    ...(status !== undefined && { status: status }),
    ...(createdAtRange !== undefined && {
      created_at: {
        gte: new Date(createdAtRange.gte),
        lte: new Date(createdAtRange.lte),
      },
    }),
  } satisfies Prisma.ecommerce_mall_customersWhereInput;
  if (includeDeleted === false) {
    whereInput.deleted_at = null;
  }
  const data = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * limit,
    take: limit,
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCustomerAtSummaryTransformer.transform,
    ),
  };
}
