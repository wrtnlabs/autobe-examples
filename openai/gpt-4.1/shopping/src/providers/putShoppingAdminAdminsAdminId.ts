import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingAdmin.IUpdate;
}): Promise<IShoppingAdmin> {
  // Check if the target admin exists and is not soft-deleted
  const admin = await MyGlobal.prisma.shopping_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Admin not found", 404);
  }
  // Email uniqueness check if email is changing
  if (
    typeof props.body.email === "string" &&
    props.body.email !== admin.email
  ) {
    const emailExists = await MyGlobal.prisma.shopping_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.adminId },
      },
    });
    if (emailExists) {
      throw new HttpException("Email already in use", 409);
    }
  }
  // Only supply provided body fields
  const updated = await MyGlobal.prisma.shopping_admins.update({
    where: { id: props.adminId },
    data: {
      ...(typeof props.body.email === "string"
        ? { email: props.body.email }
        : {}),
      ...(typeof props.body.name === "string" ? { name: props.body.name } : {}),
      ...(typeof props.body.role === "string" ? { role: props.body.role } : {}),
      ...(typeof props.body.status === "string"
        ? { status: props.body.status }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
