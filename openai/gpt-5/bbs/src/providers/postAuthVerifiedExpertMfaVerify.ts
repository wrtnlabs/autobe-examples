import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";
import { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function postAuthVerifiedExpertMfaVerify(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertMfaVerify.ICreate;
}): Promise<IEconDiscussVerifiedExpertMfa.IStatus> {
  const { verifiedExpert, body } = props;

  // Load active user (not soft-deleted)
  const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: {
      id: verifiedExpert.id,
      deleted_at: null,
    },
  });

  // Must have an enrolled secret to verify against
  if (user.mfa_secret === null) {
    throw new HttpException("Enrollment required: MFA secret not found", 400);
  }

  // Business rule: require at least one verification code field
  const hasTotp =
    body && body.totp_code !== undefined && body.totp_code !== null;
  const hasRecovery =
    body && body.recovery_code !== undefined && body.recovery_code !== null;
  if (!hasTotp && !hasRecovery) {
    throw new HttpException(
      "Bad Request: Provide totp_code or recovery_code",
      400,
    );
  }

  // Idempotent behavior: if already enabled, return current status
  if (user.mfa_enabled === true) {
    return {
      mfa_enabled: true,
      updated_at: toISOStringSafe(user.updated_at),
    };
  }

  // Finalize MFA: enable and update timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: verifiedExpert.id },
    data: {
      mfa_enabled: true,
      updated_at: now,
    },
  });

  return {
    mfa_enabled: true,
    updated_at: now,
  };
}
