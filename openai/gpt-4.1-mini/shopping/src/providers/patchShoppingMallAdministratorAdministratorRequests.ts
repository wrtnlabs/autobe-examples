import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function patchShoppingMallAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {};
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_requests.count({ where });
  const data =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      actor_type: record.actor_type,
      reason: record.reason,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
