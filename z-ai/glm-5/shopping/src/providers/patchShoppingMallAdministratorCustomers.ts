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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_customersWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && {
      email: { equals: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.displayName !== undefined &&
      props.body.displayName !== null && {
        display_name: {
          contains: props.body.displayName,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.phoneNumber !== undefined &&
      props.body.phoneNumber !== null && {
        phone_number: {
          contains: props.body.phoneNumber,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.banned !== undefined && {
      banned: props.body.banned,
    }),
    ...(props.body.createdFrom !== undefined &&
      props.body.createdTo !== undefined && {
        created_at: {
          gte: new Date(props.body.createdFrom),
          lte: new Date(props.body.createdTo),
        },
      }),
    ...(props.body.createdFrom !== undefined &&
      props.body.createdTo === undefined && {
        created_at: { gte: new Date(props.body.createdFrom) },
      }),
    ...(props.body.createdFrom === undefined &&
      props.body.createdTo !== undefined && {
        created_at: { lte: new Date(props.body.createdTo) },
      }),
  };
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      customers,
      ShoppingMallCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
