import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberPasswordResetTransformer } from "../transformers/MultiUserTodoMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findUnique({
      where: { id: props.resetId },
      ...MultiUserTodoMemberPasswordResetTransformer.select(),
    });
  if (record === null) {
    throw new HttpException("Password reset token not found", 404);
  }
  if (record.deleted_at !== null) {
    throw new HttpException(
      "Password reset token has been used or invalidated",
      404,
    );
  }
  const now = new Date();
  const expiresAt = new Date(record.expires_at);
  if (now > expiresAt) {
    throw new HttpException("Password reset token has expired", 404);
  }
  return await MultiUserTodoMemberPasswordResetTransformer.transform(record);
}
