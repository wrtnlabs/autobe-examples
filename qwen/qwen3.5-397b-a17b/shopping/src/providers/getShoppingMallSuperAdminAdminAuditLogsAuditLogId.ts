import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminAuditLogTransformer } from "../transformers/ShoppingMallAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminAdminAuditLogsAuditLogId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminAuditLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.findFirstOrThrow({
      where: {
        id: props.auditLogId,
      },
      ...ShoppingMallAdminAuditLogTransformer.select(),
    });
  return await ShoppingMallAdminAuditLogTransformer.transform(record);
}
