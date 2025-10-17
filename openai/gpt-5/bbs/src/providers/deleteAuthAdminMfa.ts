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

export async function deleteAuthAdminMfa(props: {
  admin: AdminPayload;
  body: IEconDiscussAdmin.IMfaDisableRequest;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const { admin } = props;

  const adminAssignment = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });
  if (adminAssignment === null) {
    throw new HttpException("Forbidden: Admin role not found or inactive", 403);
  }
  if (adminAssignment.enforced_2fa === true) {
    throw new HttpException(
      "Forbidden: 2FA enforcement is active for this admin; cannot disable MFA",
      403,
    );
  }

  const user = await MyGlobal.prisma.econ_discuss_users.findUniqueOrThrow({
    where: { id: admin.id },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: User is deleted", 403);
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: admin.id },
    data: {
      mfa_enabled: false,
      mfa_secret: null,
      mfa_recovery_codes: null,
      updated_at: now,
    },
  });

  return {
    outcome: "completed",
    message: "Administrator MFA disabled",
    occurred_at: now,
  };
}
