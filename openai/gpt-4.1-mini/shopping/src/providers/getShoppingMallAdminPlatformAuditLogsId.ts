import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPlatformAuditLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPlatformAuditLog> {
  const { admin, id } = props;
  try {
    const record =
      await MyGlobal.prisma.shopping_mall_platform_audit_logs.findUniqueOrThrow(
        {
          where: { id },
          select: {
            id: true,
            shopping_mall_admin_id: true,
            event_type: true,
            event_description: true,
            created_at: true,
          },
        },
      );

    return {
      id: record.id,
      shopping_mall_admin_id: record.shopping_mall_admin_id ?? null,
      event_type: record.event_type,
      event_description: record.event_description,
      created_at: toISOStringSafe(record.created_at),
    };
  } catch {
    throw new HttpException("Platform audit log not found", 404);
  }
}
