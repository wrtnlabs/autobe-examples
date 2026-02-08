import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallAdministratorAuditLogsAuditLogId(props: {
  administrator: AdministratorPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorAuditLog> {
  const record = await MyGlobal.prisma.shopping_mall_audit_logs.findUnique({
    where: { id: props.auditLogId },
  });
  if (!record) {
    throw new HttpException("Audit log not found", 404);
  }
  return {};
}
