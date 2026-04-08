import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminAuditLogTransformer } from "../transformers/EcommerceAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminAuditLog> {
  const record =
    await MyGlobal.prisma.ecommerce_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...EcommerceAdminAuditLogTransformer.select(),
    });
  return await EcommerceAdminAuditLogTransformer.transform(record);
}
