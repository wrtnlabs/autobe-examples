import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAuditLogTransformer } from "../transformers/EcommerceMallAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminAuditLogsLogId(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminAuditLog> {
  const auditLog =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...EcommerceMallAdminAuditLogTransformer.select(),
    });
  return await EcommerceMallAdminAuditLogTransformer.transform(auditLog);
}
