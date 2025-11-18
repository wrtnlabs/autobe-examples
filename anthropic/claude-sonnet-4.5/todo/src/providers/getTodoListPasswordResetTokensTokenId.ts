import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";

export async function getTodoListPasswordResetTokensTokenId(props: {
  tokenId: string & tags.Format<"uuid">;
}): Promise<ITodoListPasswordResetToken> {
  const token =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findUnique({
      where: { id: props.tokenId },
    });

  if (!token) {
    throw new HttpException("Password reset token not found", 404);
  }

  return {
    id: token.id as string & tags.Format<"uuid">,
    todo_list_user_id: token.todo_list_user_id as string & tags.Format<"uuid">,
    token: token.token,
    email: token.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(token.created_at),
    expires_at: toISOStringSafe(token.expires_at),
    used_at: token.used_at ? toISOStringSafe(token.used_at) : null,
  };
}
