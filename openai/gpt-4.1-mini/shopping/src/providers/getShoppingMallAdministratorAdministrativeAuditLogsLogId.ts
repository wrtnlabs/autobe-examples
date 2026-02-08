import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
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

export async function getShoppingMallAdministratorAdministrativeAuditLogsLogId(props: {
  administrator: AdministratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrativeAuditLog> {
  const log =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.findUnique({
      where: { id: props.logId },
      select: {
        id: true,
        administrator_id: true,
        action_type: true,
        target_entity: true,
        target_id: true,
        action_description: true,
        action_data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!log) {
    throw new HttpException("Administrative audit log not found", 404);
  }
  return {
    id: log.id,
    administrator_id: log.administrator_id,
    action_type: log.action_type,
    target_entity: log.target_entity,
    target_id: log.target_id,
    action_description: log.action_description,
    action_data: log.action_data,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : null,
  };
}
