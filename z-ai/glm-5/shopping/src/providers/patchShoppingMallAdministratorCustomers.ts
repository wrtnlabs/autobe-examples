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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          phone_number: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.displayName !== undefined &&
      props.body.displayName !== null && {
        display_name: {
          contains: props.body.displayName,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.displayName === null && { display_name: null }),
    ...(props.body.phoneNumber !== undefined &&
      props.body.phoneNumber !== null && {
        phone_number: {
          contains: props.body.phoneNumber,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.phoneNumber === null && { phone_number: null }),
    ...(props.body.banned !== undefined && { banned: props.body.banned }),
    ...((props.body.createdAtFrom || props.body.createdAtTo) && {
      created_at: {
        ...(props.body.createdAtFrom && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_customersWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "email_asc"
        ? { email: "asc" as const }
        : props.body.sort === "email_desc"
          ? { email: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_customersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
