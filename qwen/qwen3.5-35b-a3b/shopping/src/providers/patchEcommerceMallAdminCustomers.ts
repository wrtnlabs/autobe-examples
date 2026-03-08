import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  const limit = props.body.limit ?? props.body.page_size ?? 100;
  const skip = (page - 1) * limit;
  const now = toISOStringSafe(new Date());
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    deleted_at:
      props.body.deleted_at === undefined
        ? null
        : props.body.deleted_at === null
          ? { equals: null }
          : { not: null },
    is_banned:
      props.body.is_banned !== undefined ? props.body.is_banned : undefined,
    email:
      props.body.email !== undefined
        ? { contains: props.body.email, mode: "insensitive" as const }
        : undefined,
    created_at: {
      gte: props.body.created_at_gte,
      lt: props.body.created_at_lt,
    },
  };
  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.sort_order === "ASC" ? "asc" : "desc";
  const data = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit + 1,
    orderBy: {
      [orderByField]: orderByDirection,
    },
    select: {
      id: true,
      email: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  const transformedData = items.map((customer) => ({
    id: customer.id,
    email: customer.email,
    isBanned: customer.is_banned,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    customerProfile: {
      displayName: customer.email,
      phoneNumber: undefined,
      createdAt: toISOStringSafe(customer.created_at),
      updatedAt: toISOStringSafe(customer.updated_at),
    },
  }));
  const nextCursor = hasMore ? data[limit]?.id : undefined;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
