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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_customersWhereInput = {
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search } },
        { nickname: { contains: props.body.search } },
      ],
    }),
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.nickname && { nickname: { contains: props.body.nickname } }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.status && {
      deleted_at: props.body.status === "active" ? null : { not: null },
    }),
  };
  const sortParts = (props.body.sort ?? "created_at,desc").split(",");
  const sortField = sortParts[0] ?? "created_at";
  const sortDir = (sortParts[1] ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.shopping_mall_customersOrderByWithRelationInput = {
    [sortField]: sortDir,
  };
  const data = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      nickname: true,
      phone_number: true,
      created_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where: whereInput,
  });
  return {
    data: data.map((customer) => ({
      id: customer.id,
      email: customer.email,
      nickname: customer.nickname,
      phone_number: customer.phone_number,
      created_at: customer.created_at.toISOString(),
      deleted_at: customer.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
