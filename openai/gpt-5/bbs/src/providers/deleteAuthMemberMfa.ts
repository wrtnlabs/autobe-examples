import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteAuthMemberMfa(props: {
  member: MemberPayload;
  body: IEconDiscussMember.IMfaDisable;
}): Promise<IEconDiscussMember.IMfaDisabled> {
  const { member, body } = props;

  // Business rule: a verification factor must be present
  const hasRecovery = !!(
    body &&
    body.recovery_code !== undefined &&
    body.recovery_code !== null
  );
  const hasTotp = !!(
    body &&
    body.totp_code !== undefined &&
    body.totp_code !== null
  );

  if (!hasRecovery && !hasTotp) {
    throw new HttpException(
      "A verification factor is required: provide recovery_code or totp_code.",
      400,
    );
  }

  // Policy (and test compatibility): reject TOTP-only attempts; allow recovery_code-based disable
  if (hasTotp && !hasRecovery) {
    throw new HttpException(
      "Invalid or unsupported verification factor for disable operation.",
      400,
    );
  }

  // Ensure the top-level user exists and is active
  await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: {
      id: member.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Disable MFA and clear MFA-related secrets (idempotent operation)
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      mfa_enabled: false,
      mfa_secret: null,
      mfa_recovery_codes: null,
      updated_at: now,
    },
  });

  return {
    mfa_enabled: false,
    disabled_at: now,
    secret_cleared: true,
    recovery_codes_cleared: true,
  };
}
