import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";
import { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function postAuthVerifiedExpertMfaEnroll(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertMfaEnroll.ICreate;
}): Promise<IEconDiscussVerifiedExpertMfa.IEnroll> {
  const { verifiedExpert, body } = props;

  // Authorization: ensure verified expert assignment is active and user is valid
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const verified =
    await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
      where: {
        user_id: verifiedExpert.id,
        deleted_at: null,
        OR: [{ badge_valid_until: null }, { badge_valid_until: { gt: now } }],
        user: {
          is: {
            deleted_at: null,
            email_verified: true,
          },
        },
      },
    });
  if (verified === null) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch account basics for labeling the provisioning URI
  const account = await MyGlobal.prisma.econ_discuss_users.findUniqueOrThrow({
    where: { id: verifiedExpert.id },
    select: { email: true, display_name: true },
  });

  // Generate new TOTP secret (server-generated) and provisional recovery codes
  const rawSecret: string = (
    v4().replace(/-/g, "") + v4().replace(/-/g, "")
  ).toUpperCase();
  const hashedSecret: string = await PasswordUtil.hash(rawSecret);

  const recoveryCodes: readonly string[] = Array.from({ length: 10 }, () =>
    v4(),
  );
  const recoveryBundle: string = recoveryCodes.join(",");
  const hashedRecoveryBundle: string = await PasswordUtil.hash(recoveryBundle);

  // Rotate credentials: overwrite mfa_secret and mfa_recovery_codes; keep mfa_enabled=false; bump updated_at
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: verifiedExpert.id },
    data: {
      mfa_secret: hashedSecret,
      mfa_recovery_codes: hashedRecoveryBundle,
      mfa_enabled: false,
      updated_at: now,
    },
  });

  // Build otpauth provisioning URI for authenticator apps
  const issuer = "econDiscuss";
  const labelName = body.device_label
    ? `${account.email} (${body.device_label})`
    : account.email;
  const label = encodeURIComponent(`${issuer}:${labelName}`);
  const params = new URLSearchParams({
    secret: rawSecret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  }).toString();
  const otpauth_uri: string & tags.Format<"uri"> =
    `otpauth://totp/${label}?${params}`;

  // Optional provisioning expiration (e.g., 10 minutes from now)
  const provisioning_expires_at: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 10 * 60 * 1000));

  return {
    otpauth_uri,
    provisioning_expires_at,
  };
}
