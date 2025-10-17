import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  const { admin, id, body } = props;

  // Step 1: Verify the target admin exists and is active and not deleted
  const existingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id },
    });

  if (
    existingAdmin.deleted_at !== null &&
    existingAdmin.deleted_at !== undefined
  ) {
    throw new HttpException("Admin not found", 404);
  }

  // Step 2: Prepare update data
  // Since email is immutable, do not update it
  // full_name and phone_number may be nullable optional, update accordingly

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id },
    data: {
      password_hash: body.password_hash,
      full_name: body.full_name ?? undefined,
      phone_number: body.phone_number ?? undefined,
      status: body.status,
      updated_at: now,
    },
  });

  // Step 3: Return updated record with correct date conversions
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    full_name: updated.full_name ?? null,
    phone_number: updated.phone_number ?? null,
    status: updated.status as "active" | "suspended" | "disabled",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    shopping_mall_report_count: null, // not selected, default to null
  };
}
