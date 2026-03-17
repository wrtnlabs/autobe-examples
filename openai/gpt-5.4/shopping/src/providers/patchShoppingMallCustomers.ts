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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.email !== undefined && {
      email: props.body.email,
    }),
    ...(props.body.banned_at !== undefined &&
      props.body.banned_at !== null && {
        banned_at: props.body.banned_at,
      }),
    ...(props.body.created_at !== undefined &&
      props.body.created_at !== null && {
        created_at: props.body.created_at,
      }),
    ...(props.body.updated_at !== undefined &&
      props.body.updated_at !== null && {
        updated_at: props.body.updated_at,
      }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length !== 0 && {
        OR: [
          {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_customersWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
      : props.body.sort === "created_at_desc"
        ? ({
            created_at: "desc",
          } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
        : props.body.sort === "updated_at_asc"
          ? ({
              updated_at: "asc",
            } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
          : props.body.sort === "updated_at_desc"
            ? ({
                updated_at: "desc",
              } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
            : props.body.sort === "email_asc"
              ? ({
                  email: "asc",
                } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
              : props.body.sort === "email_desc"
                ? ({
                    email: "desc",
                  } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
                : props.body.sort === "banned_at_asc"
                  ? ({
                      banned_at: "asc",
                    } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
                  : props.body.sort === "banned_at_desc"
                    ? ({
                        banned_at: "desc",
                      } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput)
                    : ({
                        created_at: "desc",
                      } satisfies Prisma.shopping_mall_customersOrderByWithRelationInput);
  const records = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      banned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records.map(
      (record) =>
        ({
          id: record.id,
          email: record.email,
          banned_at:
            record.banned_at === null
              ? null
              : toISOStringSafe(record.banned_at),
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.updated_at),
          deleted_at:
            record.deleted_at === null
              ? null
              : toISOStringSafe(record.deleted_at),
        }) satisfies IShoppingMallCustomer.ISummary,
    ),
  };
}
