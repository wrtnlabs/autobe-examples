import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
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

export async function patchShoppingMallAdministratorAuditLogsSearch(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministratorAuditLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrator_audit_logs.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        administrator_id: true,
        action: true,
        description: true,
        ip: true,
        user_agent: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_administrator_audit_logs.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      administrator_id: record.administrator_id,
      action: record.action,
      description: record.description,
      ip: record.ip,
      user_agent: record.user_agent,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
