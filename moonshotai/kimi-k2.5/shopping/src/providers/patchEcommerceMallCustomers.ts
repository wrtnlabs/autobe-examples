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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomers(props: {
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search && {
      email: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
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
  } satisfies Prisma.ecommerce_mall_customersWhereInput;
  const orderByInput = (
    props.body.sort === "email"
      ? { email: (props.body.order ?? "desc") as "asc" | "desc" }
      : { created_at: (props.body.order ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_customersOrderByWithRelationInput;
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      customers,
      EcommerceMallCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
