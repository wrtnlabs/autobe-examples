import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
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

export async function getMultiUserTodoMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string &
    tags.Format<"uri"> &
    tags.ContentMediaType<"application/json"> &
    tags.MinLength<1> &
    tags.MaxLength<2048>;
}): Promise<IMultiUserTodoMemberPasswordReset.IInvert> {
  const tokenRow =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findUnique({
      where: { token: props.resetId },
      select: {
        token: true,
        expires_at: true,
      },
    });
  if (tokenRow === null) {
    throw new HttpException("Invalid reset token", 400);
  }
  const expiresAtMs = tokenRow.expires_at.getTime();
  const nowMs = Date.now();
  if (expiresAtMs <= nowMs) {
    throw new HttpException("Reset token expired", 400);
  }
  return {
    resetId: typia.assert<IMultiUserTodoMemberPasswordReset.IInvert["resetId"]>(
      tokenRow.token,
    ),
    expiresAt: typia.assert<
      IMultiUserTodoMemberPasswordReset.IInvert["expiresAt"]
    >(tokenRow.expires_at.toISOString()),
    isValid: true,
  };
}
