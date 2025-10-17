import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // Prevent self-deletion
  if (admin.id === adminId) {
    throw new HttpException(
      "Unauthorized: Cannot delete your own admin account",
      403,
    );
  }

  // Verify requesting admin has super_admin role level
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: admin.id },
      select: { role_level: true },
    });

  if (requestingAdmin.role_level !== "super_admin") {
    throw new HttpException(
      "Unauthorized: Only super administrators can delete admin accounts",
      403,
    );
  }

  // Verify target admin exists and execute hard delete
  // findUniqueOrThrow will throw 404 if admin doesn't exist
  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: { id: adminId },
  });
}
