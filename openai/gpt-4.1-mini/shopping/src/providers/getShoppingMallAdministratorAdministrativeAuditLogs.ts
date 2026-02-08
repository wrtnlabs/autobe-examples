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

export async function getShoppingMallAdministratorAdministrativeAuditLogs(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIShoppingMallAdministratorAuditLog> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrative_audit_logs.findMany({
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action_type: true,
        target_entity: true,
        target_id: true,
        action_description: true,
        action_data: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_administrative_audit_logs.count(),
  ]);
  const data = records.map((record) => ({
    id: record.id,
    action_type: record.action_type,
    target_entity: record.target_entity,
    target_id: record.target_id,
    action_description: record.action_description,
    action_data: record.action_data ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    administrator: null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
