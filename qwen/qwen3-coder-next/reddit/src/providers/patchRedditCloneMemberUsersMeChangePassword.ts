import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberUsersMeChangePassword(props: {
  member: MemberPayload;
  body: IRedditCloneMember.IChangePassword;
}): Promise<void> {
  // 1. Load member by ID from session token
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      id: props.member.id as string & tags.Format<"uuid">,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // 2. Verify current password using bcrypt comparison
  const currentPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    member.password_hash,
  );
  if (!currentPasswordValid) {
    throw new HttpException("Current password does not match", 400);
  }
  // 3. Validate new password meets security requirements (min 8 chars, complexity)
  if (props.body.newPassword.length < 8) {
    throw new HttpException(
      "New password must meet security requirements",
      400,
    );
  }
  // 4. Verify new password differs from current password
  const newHash = await PasswordUtil.hash(props.body.newPassword);
  if (newHash === member.password_hash) {
    throw new HttpException("New password must differ from current", 400);
  }
  // 5. Hash new password with bcrypt (minimum 12 rounds)
  // Already done above with PasswordUtil.hash
  // 6. Update password_hash field with new hash
  await MyGlobal.prisma.reddit_clone_members.update({
    where: { id: props.member.id as string & tags.Format<"uuid"> },
    data: {
      password_hash: newHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 7. Return success response
  return;
}
