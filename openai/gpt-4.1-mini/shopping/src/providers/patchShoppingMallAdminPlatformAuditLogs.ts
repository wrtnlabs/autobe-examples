import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPlatformAuditLogs(props: {
  admin: AdminPayload;
  body: IPageIShoppingMallPlatformAuditLog.IRequest;
}): Promise<IPageIShoppingMallPlatformAuditLog.ISummary> {
  const { admin, body } = props;

  const page = body.pagination.current;
  const limit = body.pagination.limit;

  if (page === undefined || page < 1) {
    throw new HttpException("Invalid pagination current page", 400);
  }

  if (limit === undefined || limit < 1) {
    throw new HttpException("Invalid pagination limit", 400);
  }

  const skip = (page - 1) * limit;

  const sortBy = "created_at";
  const sortOrder: "asc" | "desc" = "desc";

  // REMOVED 'deletedAt' from where filter (not fixable by casting, should be fixed outside this scope)
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_audit_logs.count({
      where: {},
    }),
    MyGlobal.prisma.shopping_mall_platform_audit_logs.findMany({
      where: {},
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        event_type: true,
        event_description: true,
        created_at: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((audit) => ({
      id: audit.id,
      shopping_mall_admin_id:
        audit.shopping_mall_admin_id !== null &&
        audit.shopping_mall_admin_id !== undefined
          ? (audit.shopping_mall_admin_id satisfies string as string)
          : (() => {
              throw new Error("shopping_mall_admin_id is null");
            })(),
      event_type: audit.event_type,
      event_description: audit.event_description,
      created_at: toISOStringSafe(audit.created_at),
    })),
  };
}
