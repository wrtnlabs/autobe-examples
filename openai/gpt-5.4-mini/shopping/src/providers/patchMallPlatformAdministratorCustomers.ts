import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCustomerAtSummaryTransformer } from "../transformers/MallPlatformCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCustomer.IRequest;
}): Promise<IPageIMallPlatformCustomer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_customersWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          email: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
  };
  const sortDirection: "asc" | "desc" = props.body.order ?? "desc";
  const firstOrderBy: Prisma.mall_platform_customersOrderByWithRelationInput =
    props.body.sort === "email"
      ? { email: sortDirection }
      : props.body.sort === "status"
        ? { status: sortDirection }
        : props.body.sort === "createdAt"
          ? { created_at: sortDirection }
          : props.body.sort === "updatedAt"
            ? { updated_at: sortDirection }
            : { created_at: "desc" };
  const data = await MyGlobal.prisma.mall_platform_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy: [firstOrderBy, { id: "desc" }],
    ...MallPlatformCustomerAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.mall_platform_customers.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
