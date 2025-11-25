import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const createdAtCondition: Record<string, string & tags.Format<"date-time">> =
    {};
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    createdAtCondition.gte = props.body.created_after;
  }
  if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    createdAtCondition.lte = props.body.created_before;
  }

  const where = {
    ...(props.body.action_type !== undefined && props.body.action_type !== null
      ? { action_type: props.body.action_type }
      : {}),
    ...(props.body.resource_type !== undefined &&
    props.body.resource_type !== null
      ? { resource_type: props.body.resource_type }
      : {}),
    ...(props.body.resource_id !== undefined && props.body.resource_id !== null
      ? { resource_id: props.body.resource_id }
      : {}),
    ...(props.body.success !== undefined && props.body.success !== null
      ? { success: props.body.success }
      : {}),
    ...(Object.keys(createdAtCondition).length > 0
      ? { created_at: createdAtCondition }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_admin_audit_logs.count({ where }),
  ]);

  return {
    data: data.map((item) => {
      const createdAt = toISOStringSafe(item.created_at);
      return {
        id: item.id,
        shopping_mall_admin_id: item.shopping_mall_admin_id,
        action_type: item.action_type,
        resource_type: item.resource_type,
        success: item.success,
        created_at: createdAt,
      };
    }),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
