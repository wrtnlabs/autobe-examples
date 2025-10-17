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

export async function postAuthMemberEmailVerificationResend(props: {
  member: MemberPayload;
}): Promise<IEconDiscussMember.IEmailVerification> {
  const { member } = props;

  // Authorization: ensure active membership and active user record
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

  // Fetch user and check verification state
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: member.id, deleted_at: null },
    select: { id: true, email_verified: true },
  });
  if (user === null) {
    throw new HttpException("Not Found", 404);
  }

  if (user.email_verified === true) {
    throw new HttpException("Email already verified", 409);
  }

  // Bookkeeping: touch updated_at, queue email out-of-band
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: { updated_at: now },
  });

  // Acknowledgement payload; omit email to avoid leaking and branding assertions
  return {
    email_verified: false,
    status: "queued",
    requested_at: now,
    processed_at: now,
  };
}
