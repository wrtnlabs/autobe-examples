import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminMfaSetup(props: {
  admin: AdminPayload;
  body: IEconDiscussAdmin.IMfaSetupRequest;
}): Promise<IEconDiscussAdmin.IMfaSetup> {
  const { admin, body } = props;

  // Authorization: ensure the admin's user exists and is not soft-deleted
  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: admin.id },
    select: { id: true, email: true, display_name: true, deleted_at: true },
  });
  if (user === null) throw new HttpException("Admin user not found", 404);
  if (user.deleted_at !== null)
    throw new HttpException("Admin account is deleted", 403);

  // Prepare MFA artifacts (TOTP)
  const secretPlain = (
    v4().replace(/-/g, "") + v4().replace(/-/g, "")
  ).toUpperCase();

  // Masked secret for display (show last 4 chars)
  const secret_masked =
    secretPlain.length > 4
      ? `${"*".repeat(secretPlain.length - 4)}${secretPlain.slice(-4)}`
      : "****";

  // Hash the secret for storage (encrypted/managed at rest)
  const hashedSecret = await PasswordUtil.hash(secretPlain);

  // Generate recovery codes and hash them for storage
  const rawRecoveryCodes: readonly string[] = Array.from({ length: 10 }, () =>
    v4().replace(/-/g, "").toUpperCase(),
  );
  const hashedRecoveryCodes = await Promise.all(
    rawRecoveryCodes.map((c) => PasswordUtil.hash(c)),
  );

  // Persist MFA setup to user row without enabling MFA yet
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: admin.id },
    data: {
      mfa_secret: hashedSecret,
      mfa_recovery_codes: JSON.stringify({
        version: 1,
        codes: hashedRecoveryCodes,
      }),
      mfa_enabled: false,
    },
  });

  // Build otpauth provisioning URI (avoid referencing unknown env fields)
  const issuer = "econDiscuss";
  const accountLabel = `${issuer}:${user.email}`;
  const provisioning_uri_value = `otpauth://totp/${encodeURIComponent(accountLabel)}?secret=${secretPlain}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const provisioning_uri = typia.assert<string & tags.Format<"uri">>(
    provisioning_uri_value,
  );

  const method: IEAuthMfaMethod = body.method;

  return {
    method,
    provisioning_uri,
    secret_masked,
  };
}
