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

export async function postAuthMemberMfaSetup(props: {
  member: MemberPayload;
}): Promise<IEconDiscussMember.IMfaSetup> {
  const { member } = props;

  const membership = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
    select: { id: true },
  });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }

  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: member.id, deleted_at: null },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new HttpException("Not Found", 404);
  }

  const issuer = "econDiscuss";
  const accountLabel = issuer + ":" + user.email;
  const rawSecret =
    v4().replace(/-/g, "").toUpperCase() + v4().replace(/-/g, "").toUpperCase();

  const otpauth_uri =
    "otpauth://totp/" +
    encodeURIComponent(accountLabel) +
    "?secret=" +
    rawSecret +
    "&issuer=" +
    encodeURIComponent(issuer) +
    "&algorithm=SHA1&digits=6&period=30";

  const recoveryCodes: string[] = Array.from({ length: 10 }, () =>
    v4().replace(/-/g, "").slice(0, 10).toUpperCase(),
  );

  const hashedSecret = await PasswordUtil.hash(rawSecret);
  const hashedCodesList = await Promise.all(
    recoveryCodes.map((code) => PasswordUtil.hash(code)),
  );
  const hashedCodesBundle =
    hashedCodesList.join(
      "\
",
    );

  const expires_at = toISOStringSafe(new Date(Date.now() + 10 * 60 * 1000));

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      mfa_secret: hashedSecret,
      mfa_recovery_codes: hashedCodesBundle,
      mfa_enabled: false,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    otpauth_uri,
    expires_at,
  };
}
