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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  // Since page, limit, and filtering properties do not exist on IRequest, use default pagination
  const page: number = 1;
  const limit: number = 100;
  const skip = 0;
  type PrismaWhere = {
    deleted_at?: null | undefined;
  };
  const where: PrismaWhere = { deleted_at: null };
  const data = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(
      (record): IShoppingMallCustomer.ISummary => ({
        id: record.id,
        email: record.email,
        displayName: record.display_name ?? null,
        phoneNumber: record.phone_number ?? null,
      }),
    ),
  };
}
