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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomers(props: {
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.ecommerce_mall_customersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    whereConditions.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  const orderBy: Prisma.ecommerce_mall_customersOrderByWithRelationInput =
    props.body.sort === "createdAt"
      ? { created_at: "desc" }
      : { created_at: "desc" };
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      created_at: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereConditions,
  });
  const data = customers.map((customer) => ({
    id: customer.id,
    email: customer.email,
    createdAt: customer.created_at.toISOString(),
    orderCount: customer._count.orders,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
