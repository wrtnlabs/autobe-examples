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
import { MultiUserTodoMemberPasswordResetTransformer } from "../transformers/MultiUserTodoMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberMembersPasswordResetsResetTokenId(props: {
  member: MemberPayload;
  resetTokenId: string;
}): Promise<IMultiUserTodoMemberPasswordReset> {
  // Find password reset token by unique token field
  const reset =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findUniqueOrThrow(
      {
        where: { token: props.resetTokenId },
        ...MultiUserTodoMemberPasswordResetTransformer.select(),
      },
    );
  // Validate token belongs to the authenticated member
  if (reset.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate token hasn't expired
  const now = new Date();
  if (reset.expires_at < now) {
    throw new HttpException("Token expired", 400);
  }
  // Validate token hasn't been used
  if (reset.used_at !== null) {
    throw new HttpException("Token already used", 400);
  }
  // Return transformed token details
  return await MultiUserTodoMemberPasswordResetTransformer.transform(reset);
}
