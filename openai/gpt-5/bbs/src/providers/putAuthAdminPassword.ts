import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putAuthAdminPassword(props: {
  admin: AdminPayload;
  body: IEconDiscussAdmin.IChangePassword;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const { admin, body } = props;

  // Fetch the admin's user record with soft-delete guard
  const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: {
      id: admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
      password_hash: true,
    },
  });

  // Verify current password against stored hash (business logic validation)
  const valid = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!valid) {
    // Generic message to avoid leaking credential specifics
    throw new HttpException("Forbidden", 403);
  }

  // Prepare new password hash and timestamps
  const now = toISOStringSafe(new Date());
  const newHash = await PasswordUtil.hash(body.new_password);

  // Update password hash and updated_at timestamp
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: user.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });

  // Return security event acknowledgment
  return {
    outcome: "updated",
    occurred_at: now,
  };
}
