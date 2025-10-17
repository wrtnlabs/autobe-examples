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

export async function putAuthMemberPassword(props: {
  member: MemberPayload;
  body: IEconDiscussMember.IUpdatePassword;
}): Promise<IEconDiscussMember.ISecurityEvent> {
  const { member, body } = props;

  // Authorization: ensure active member role and active top-level user
  const membership = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });
  if (membership === null) {
    throw new HttpException("Forbidden: Inactive or missing member role", 403);
  }

  // Fetch user credentials for verification (active user only)
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: member.id, deleted_at: null },
    select: { id: true, password_hash: true },
  });
  if (!user) {
    throw new HttpException("Not Found", 404);
  }

  // Verify the current password
  const verified = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!verified) {
    throw new HttpException("Invalid current password", 403);
  }

  // Compute new password hash
  const hashed = await PasswordUtil.hash(body.new_password);

  // Update password and touch updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      password_hash: hashed,
      updated_at: now,
    },
  });

  return {
    code: "PASSWORD_CHANGED",
    message: "Password updated successfully.",
    timestamp: now,
  };
}
