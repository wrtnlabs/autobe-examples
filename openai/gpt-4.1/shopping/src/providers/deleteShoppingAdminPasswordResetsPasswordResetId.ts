import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminPasswordResetsPasswordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the password reset entry exists
  const reset = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { id: props.passwordResetId },
  });
  if (!reset) {
    throw new HttpException("Password reset request not found", 404);
  }

  // Hard delete the password reset entry
  await MyGlobal.prisma.shopping_password_resets.delete({
    where: { id: props.passwordResetId },
  });

  // Audit log admin operation
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "security",
      event_type: "ADMIN_DELETE_PASSWORD_RESET",
      ip: null,
      description: `Admin ${props.admin.id} deleted password reset ${props.passwordResetId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
