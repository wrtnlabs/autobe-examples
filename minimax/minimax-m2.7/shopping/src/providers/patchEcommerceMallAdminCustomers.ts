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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where conditions array
  const conditions: Prisma.InputJsonObject[] = [];
  // Email partial match search (case-insensitive)
  if (props.body.email !== undefined) {
    conditions.push({
      email: {
        contains: props.body.email,
        mode: "insensitive",
      } as Prisma.InputJsonValue,
    } as Prisma.InputJsonObject);
  }
  // Status filter: active = deleted_at IS NULL, deleted = deleted_at IS NOT NULL
  if (props.body.status !== undefined) {
    conditions.push({
      deleted_at: props.body.status === "active" ? null : Prisma.sql`NOT NULL`,
    } as unknown as Prisma.InputJsonObject);
  }
  // Date range filters
  if (props.body.createdAtFrom !== undefined) {
    conditions.push({
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      } as Prisma.InputJsonValue,
    } as Prisma.InputJsonObject);
  }
  if (props.body.createdAtTo !== undefined) {
    conditions.push({
      created_at: {
        lte: new Date(props.body.createdAtTo),
      } as Prisma.InputJsonValue,
    } as Prisma.InputJsonObject);
  }
  // Combine conditions
  const where =
    conditions.length > 0
      ? ({
          AND: conditions,
        } as unknown as Prisma.ecommerce_mall_customersWhereInput)
      : undefined;
  // Sorting - validate and apply
  const validSortColumns = ["created_at", "email"] as const;
  const sortBy = props.body.sortBy as
    | (typeof validSortColumns)[number]
    | undefined;
  const orderBy =
    sortBy !== undefined && validSortColumns.includes(sortBy)
      ? ({ [sortBy]: "desc" } as const)
      : ({ created_at: "desc" } as const);
  // Execute queries
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      created_at: true,
      deleted_at: true,
      profile: {
        select: {
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where,
  });
  // Transform results using Promise.all with explicit type assertion
  const data = (await Promise.all(
    customers.map(
      (customer) =>
        ({
          id: customer.id as string & tags.Format<"uuid">,
          email: customer.email as string & tags.Format<"email">,
          created_at: toISOStringSafe(customer.created_at),
          display_name: customer.profile?.display_name ?? null,
          status: (customer.deleted_at !== null ? "deleted" : "active") as
            | "active"
            | "deleted",
        }) as IPageIEcommerceMallCustomer.ISummary["data"][number],
    ),
  )) as IPageIEcommerceMallCustomer.ISummary["data"];
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  };
}
