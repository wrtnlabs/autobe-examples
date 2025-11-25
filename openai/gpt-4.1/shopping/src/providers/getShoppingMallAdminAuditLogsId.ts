import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAuditLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAuditLog> {
  const record = await MyGlobal.prisma.shopping_mall_audit_logs.findUnique({
    where: { id: props.id },
  });

  if (!record) {
    throw new HttpException("Audit log entry not found", 404);
  }

  return {
    id: record.id,
    change_type: record.change_type,
    risk_level: record.risk_level,
    compliance_tag: record.compliance_tag,
    audit_detail: record.audit_detail,
    created_at: toISOStringSafe(record.created_at),
    actor_admin_id:
      record.actor_admin_id === null ? null : record.actor_admin_id,
    actor_seller_id:
      record.actor_seller_id === null ? null : record.actor_seller_id,
    actor_customer_id:
      record.actor_customer_id === null ? null : record.actor_customer_id,
  };
}
