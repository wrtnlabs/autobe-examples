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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.displayName !== undefined && {
      display_name: {
        contains: props.body.displayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.phoneNumber !== undefined && {
      phone_number: {
        contains: props.body.phoneNumber,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.createdFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo !== undefined && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.isDeleted === true && { deleted_at: { not: null } }),
    ...(props.body.isDeleted === false && { deleted_at: null }),
  } satisfies Prisma.shopping_mall_customersWhereInput;
  // Build ORDER BY
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "created_at_asc":
        return { created_at: "asc" as const };
      case "email_asc":
        return { email: "asc" as const };
      case "email_desc":
        return { email: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.shopping_mall_customersOrderByWithRelationInput;
  // Execute queries
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where: whereInput,
  });
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Transform to ISummary
  const data = customers.map(
    (customer) =>
      ({
        id: customer.id,
        email: customer.email,
        displayName: customer.display_name,
        phoneNumber: customer.phone_number,
        isDeleted: customer.deleted_at !== null,
        createdAt: customer.created_at.toISOString(),
        updatedAt: customer.updated_at.toISOString(),
      }) satisfies IShoppingMallCustomer.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallCustomer.ISummary;
}
