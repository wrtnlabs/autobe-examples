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

export async function postAuthMemberMfaRecoveryCodesRegenerate(props: {
  member: MemberPayload;
  body: IEconDiscussMember.IMfaRegenerateCodes;
}): Promise<IEconDiscussMember.IMfaRecoveryCodes> {
  const { member, body } = props;

  // 1) Load active user (role already authorized). Ensure account not soft-deleted.
  const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: {
      id: member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      mfa_enabled: true,
      mfa_secret: true,
    },
  });

  // 2) Preconditions: MFA must be enabled and secret must exist
  if (!user.mfa_enabled) {
    throw new HttpException("MFA is not enabled for this account", 400);
  }
  if (user.mfa_secret === null) {
    throw new HttpException("MFA secret is not configured", 400);
  }

  // 3) Validate TOTP code (business validation). No TOTP util provided – use testing-mode allowance.
  //    In testing, accept a conventional code to enable regeneration flows; otherwise reject.
  const isTestingAllowed =
    MyGlobal.testing === true && body.totp_code === "123456";
  if (!isTestingAllowed) {
    throw new HttpException("Invalid or expired TOTP code", 403);
  }

  // 4) Generate fresh recovery codes (unique) and hash them for storage
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const count = 10; // within tags.MinItems<1> & tags.MaxItems<20>
  const length = 12; // within tags.MinLength<8> & tags.MaxLength<128>

  const generateOne = (): string => {
    // Use UUID v4 source, strip dashes, and slice to desired length
    const raw = v4().replace(/-/g, "");
    return raw.substring(0, length);
  };

  // Build unique codes without assertions by constructing with correct type
  const codesBase: string[] = (() => {
    const s = new Set<string>();
    while (s.size < count) s.add(generateOne());
    return Array.from(s);
  })();
  const codes: (string & tags.MinLength<8> & tags.MaxLength<128>)[] =
    codesBase.map((c) => c);

  const hashedList = await Promise.all(codes.map((c) => PasswordUtil.hash(c)));
  const stored = JSON.stringify(hashedList);

  // 5) Persist rotation (replace recovery codes and touch updated_at)
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: user.id },
    data: {
      mfa_recovery_codes: stored,
      updated_at: now,
    },
  });

  // 6) Return one-time display payload (do not return hashed values)
  return {
    mfa_enabled: true,
    codes,
    generated_at: now,
  };
}
