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

export async function postShoppingAdminAdminSuspensions(props: {
  admin: AdminPayload;
  body: IShoppingAdminSuspension.ICreate;
}): Promise<IShoppingAdminSuspension> {
  const { admin, body } = props;
  if (!admin || !admin.id) {
    throw new HttpException("Unauthorized: Admin login required", 401);
  }
  const suspendedIds = [
    body.suspended_admin_id,
    body.suspended_seller_id,
    body.suspended_customer_id,
  ];
  const setCount = suspendedIds.filter(
    (x) => x !== null && x !== undefined,
  ).length;
  if (setCount !== 1) {
    throw new HttpException(
      "Exactly one of suspended_admin_id, suspended_seller_id, or suspended_customer_id must be provided",
      400,
    );
  }
  if (body.suspended_admin_id && admin.id === body.suspended_admin_id) {
    throw new HttpException("Cannot suspend oneself", 400);
  }
  const where = {
    ...(body.suspended_admin_id !== undefined &&
      body.suspended_admin_id !== null && {
        suspended_admin_id: body.suspended_admin_id,
      }),
    ...(body.suspended_seller_id !== undefined &&
      body.suspended_seller_id !== null && {
        suspended_seller_id: body.suspended_seller_id,
      }),
    ...(body.suspended_customer_id !== undefined &&
      body.suspended_customer_id !== null && {
        suspended_customer_id: body.suspended_customer_id,
      }),
    status: { notIn: ["revoked", "expired"] },
    deleted_at: null,
  };
  const duplicate = await MyGlobal.prisma.shopping_admin_suspensions.findFirst({
    where,
  });
  if (duplicate) {
    throw new HttpException(
      "Duplicate suspension: There is already an active or pending suspension for this actor.",
      409,
    );
  }
  const id = v4();
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_admin_suspensions.create({
    data: {
      id,
      admin_id: body.admin_id,
      suspended_admin_id: body.suspended_admin_id ?? null,
      suspended_seller_id: body.suspended_seller_id ?? null,
      suspended_customer_id: body.suspended_customer_id ?? null,
      suspension_type: body.suspension_type,
      reason: body.reason,
      start_at: body.start_at,
      end_at: body.end_at ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    admin_id: created.admin_id,
    suspended_admin_id: created.suspended_admin_id ?? undefined,
    suspended_seller_id: created.suspended_seller_id ?? undefined,
    suspended_customer_id: created.suspended_customer_id ?? undefined,
    suspension_type: created.suspension_type,
    reason: created.reason,
    start_at: toISOStringSafe(created.start_at),
    end_at:
      created.end_at != null ? toISOStringSafe(created.end_at) : undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
