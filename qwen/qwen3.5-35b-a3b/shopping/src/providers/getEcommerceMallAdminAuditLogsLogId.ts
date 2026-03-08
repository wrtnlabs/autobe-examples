import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerAtAdminAuditLogTransformer } from "../transformers/EcommerceMallCustomerAtAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomer.IAdminAuditLog> {
  const auditLog =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...EcommerceMallCustomerAtAdminAuditLogTransformer.select(),
    });
  return await EcommerceMallCustomerAtAdminAuditLogTransformer.transform(
    auditLog,
  );
}
