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

export async function putShoppingAdminAdminSuspensionsAdminSuspensionId(props: {
  admin: AdminPayload;
  adminSuspensionId: string & tags.Format<"uuid">;
  body: IShoppingAdminSuspension.IUpdate;
}): Promise<IShoppingAdminSuspension> {
  // Find the suspension record and ensure it exists and is not soft-deleted
  const existing = await MyGlobal.prisma.shopping_admin_suspensions.findUnique({
    where: { id: props.adminSuspensionId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Suspension record not found", 404);
  }

  // Disallow reactivation of a permanent suspension (suspension_type === 'permanent' && end_at === null)
  const isPermanent =
    existing.suspension_type === "permanent" && existing.end_at === null;
  if (isPermanent && props.body.status === "active") {
    throw new HttpException("Cannot reactivate a permanent suspension.", 400);
  }

  // Only update permitted fields, never immutable ones. Always set updated_at.
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.suspension_type !== undefined && {
      suspension_type: props.body.suspension_type,
    }),
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.start_at !== undefined && { start_at: props.body.start_at }),
    ...(props.body.end_at !== undefined && { end_at: props.body.end_at }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.shopping_admin_suspensions.update({
    where: { id: props.adminSuspensionId },
    data: updateData,
  });

  return {
    id: updated.id,
    admin_id: updated.admin_id,
    suspended_admin_id: updated.suspended_admin_id ?? null,
    suspended_seller_id: updated.suspended_seller_id ?? null,
    suspended_customer_id: updated.suspended_customer_id ?? null,
    suspension_type: updated.suspension_type,
    reason: updated.reason,
    start_at: toISOStringSafe(updated.start_at),
    end_at:
      updated.end_at !== null && updated.end_at !== undefined
        ? toISOStringSafe(updated.end_at)
        : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
