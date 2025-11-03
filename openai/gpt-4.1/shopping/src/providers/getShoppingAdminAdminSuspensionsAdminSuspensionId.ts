import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminAdminSuspensionsAdminSuspensionId(props: {
  admin: AdminPayload;
  adminSuspensionId: string & tags.Format<"uuid">;
}): Promise<IShoppingAdminSuspension> {
  const { adminSuspensionId } = props;
  const record = await MyGlobal.prisma.shopping_admin_suspensions.findUnique({
    where: { id: adminSuspensionId },
  });
  if (!record) {
    throw new HttpException("Suspension not found", 404);
  }
  return {
    id: record.id,
    admin_id: record.admin_id,
    suspended_admin_id: record.suspended_admin_id ?? undefined,
    suspended_seller_id: record.suspended_seller_id ?? undefined,
    suspended_customer_id: record.suspended_customer_id ?? undefined,
    suspension_type: record.suspension_type,
    reason: record.reason,
    start_at: toISOStringSafe(record.start_at),
    end_at: record.end_at ? toISOStringSafe(record.end_at) : undefined,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
