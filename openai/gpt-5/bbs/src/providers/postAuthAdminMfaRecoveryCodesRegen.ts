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

export async function postAuthAdminMfaRecoveryCodesRegen(props: {
  admin: AdminPayload;
  body: IEconDiscussAdmin.IMfaRegenerateRequest;
}): Promise<IEconDiscussAdmin.IMfaRecoveryCodes> {
  const { admin } = props;

  // 1) Ensure admin role exists and is active (with soft-delete guards)
  const adminRole = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });
  if (adminRole === null) {
    throw new HttpException(
      "Unauthorized: Admin role not found or inactive",
      403,
    );
  }

  // 2) Load the user record; ensure active and MFA enabled
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: admin.id, deleted_at: null },
  });
  if (user === null) {
    throw new HttpException("Not Found: Admin user not found", 404);
  }
  if (user.mfa_enabled !== true) {
    throw new HttpException(
      "Conflict: MFA must be enabled before regenerating recovery codes",
      409,
    );
  }
  if (user.mfa_secret === null || user.mfa_secret === undefined) {
    throw new HttpException("Conflict: MFA secret not configured", 409);
  }

  // 3) Generate plaintext recovery codes (displayed once)
  const generateCode = (): string =>
    v4().replace(/-/g, "").slice(0, 10).toUpperCase();
  const codes = Array.from({ length: 10 }, () => generateCode());

  // 4) Hash codes for secure storage only (server-side)
  const hashedCodes = await Promise.all(
    codes.map((code) => PasswordUtil.hash(code)),
  );
  const storedPayload = JSON.stringify(hashedCodes);

  // 5) Persist hashed codes; do not change mfa_enabled
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: admin.id },
    data: {
      mfa_recovery_codes: storedPayload,
      updated_at: now,
    },
  });

  // 6) Return the new codes once with metadata
  return {
    codes,
    count: Number(codes.length) as number & tags.Type<"int32">,
    generatedAt: now,
  };
}
