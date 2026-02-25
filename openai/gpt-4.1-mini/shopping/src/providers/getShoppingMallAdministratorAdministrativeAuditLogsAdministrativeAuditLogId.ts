import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministrativeAuditLogTransformer } from "../transformers/ShoppingMallAdministrativeAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAdministrativeAuditLogsAdministrativeAuditLogId(props: {
  administrator: AdministratorPayload;
  administrativeAuditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrativeAuditLog> {
  const auditLogRecord =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.administrativeAuditLogId },
        ...ShoppingMallAdministrativeAuditLogTransformer.select(),
      },
    );
  return await ShoppingMallAdministrativeAuditLogTransformer.transform(
    auditLogRecord,
  );
}
