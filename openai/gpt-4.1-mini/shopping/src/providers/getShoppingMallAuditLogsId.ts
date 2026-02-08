import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAuditLogsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorAuditLog> {
  const record = await MyGlobal.prisma.shopping_mall_audit_logs.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      event_type: true,
      description: true,
      actor_type: true,
      actor_id: true,
      ip: true,
      user_agent: true,
      metadata: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!record) throw new HttpException("Audit log not found", 404);
  return {
    id: record.id,
    event_type: record.event_type,
    description: record.description,
    actor_type: record.actor_type,
    actor_id: record.actor_id,
    ip: record.ip,
    user_agent: record.user_agent,
    metadata: record.metadata,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
