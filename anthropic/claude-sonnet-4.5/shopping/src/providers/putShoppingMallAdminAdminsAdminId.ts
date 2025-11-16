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

export async function putShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  const existing = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Admin account not found", 404);
  }

  if (props.body.email && props.body.email !== existing.email) {
    const emailExists = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.adminId },
        deleted_at: null,
      },
    });

    if (emailExists) {
      throw new HttpException("Email already in use by another admin", 409);
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      ...(props.body.full_name !== undefined && {
        full_name: props.body.full_name,
      }),
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      ...(props.body.admin_level !== undefined && {
        admin_level: props.body.admin_level,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    full_name: updated.full_name,
    phone_number: updated.phone_number,
    admin_level: typia.assert<"super_admin" | "moderator" | "support">(
      updated.admin_level,
    ),
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
