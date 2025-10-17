import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogoutAll(props: {
  member: MemberPayload;
}): Promise<void> {
  const { member } = props;

  // Ensure the member role is active and the top-level user is not deleted
  const activeMember = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: {
        is: { deleted_at: null },
      },
    },
    select: { id: true },
  });

  if (activeMember === null) {
    throw new HttpException("Forbidden", 403);
  }

  // Global logout: update the user's updated_at to revoke existing tokens (out-of-band revocation strategy)
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    select: { id: true },
  });

  return;
}
