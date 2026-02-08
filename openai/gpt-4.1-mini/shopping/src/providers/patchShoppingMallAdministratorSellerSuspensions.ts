import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
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

export async function patchShoppingMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerSuspension.IRequest;
}): Promise<IPageIShoppingMallSellerSuspension.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null as null,
  } satisfies Prisma.shopping_mall_seller_suspensionsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_seller_suspensions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { suspended_at: "desc" },
    select: {
      id: true,
      seller_id: true,
      suspension_reason: true,
      suspended_at: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_seller_suspensions.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      seller_id: record.seller_id,
      suspension_reason: record.suspension_reason,
      suspended_at: toISOStringSafe(record.suspended_at),
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
