import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { IShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminAuditLogTransformer } from "../transformers/ShoppingMallSuperAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminSuperAdminAuditLogsAuditLogId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdminAuditLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_super_admin_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.auditLogId },
        ...ShoppingMallSuperAdminAuditLogTransformer.select(),
      },
    );
  return await ShoppingMallSuperAdminAuditLogTransformer.transform(record);
}
