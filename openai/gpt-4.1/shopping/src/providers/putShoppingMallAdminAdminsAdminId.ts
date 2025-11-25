import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  // Prevent self-demotion (admin cannot change their own status to non-active)
  if (
    props.admin.id === props.adminId &&
    props.body.status &&
    props.body.status !== "active"
  ) {
    throw new HttpException(
      "Admin cannot demote or revoke their own account.",
      403,
    );
  }

  // Fetch target admin
  const target = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!target) {
    throw new HttpException("Administrator not found.", 404);
  }

  // If email is changing, ensure uniqueness
  if (
    typeof props.body.email === "string" &&
    props.body.email !== target.email
  ) {
    const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.adminId },
      },
    });
    if (existing) {
      throw new HttpException("Email already exists.", 400);
    }
  }

  // Prepare update fields
  const updateData: Record<string, unknown> = {};
  if (typeof props.body.email === "string") updateData.email = props.body.email;
  if (typeof props.body.name === "string") updateData.name = props.body.name;
  if (typeof props.body.is_email_verified === "boolean")
    updateData.is_email_verified = props.body.is_email_verified;
  if (typeof props.body.status === "string")
    updateData.status = props.body.status;

  // If password is provided, securely hash it
  if (
    typeof props.body.password === "string" &&
    props.body.password.length > 0
  ) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // Always set updated_at
  updateData.updated_at = toISOStringSafe(new Date());

  // Run the update
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    is_email_verified: updated.is_email_verified,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
