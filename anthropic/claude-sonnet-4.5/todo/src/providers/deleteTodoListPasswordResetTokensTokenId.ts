import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";

export async function deleteTodoListPasswordResetTokensTokenId(props: {
  tokenId: string & tags.Format<"uuid">;
}): Promise<ITodoListPasswordResetToken> {
  const existing =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findUnique({
      where: { id: props.tokenId },
    });

  if (!existing) {
    throw new HttpException("Password reset token not found", 404);
  }

  const deleted = await MyGlobal.prisma.todo_list_password_reset_tokens.delete({
    where: { id: props.tokenId },
  });

  return {
    id: deleted.id,
    todo_list_user_id: deleted.todo_list_user_id,
    token: deleted.token,
    email: deleted.email,
    created_at: toISOStringSafe(deleted.created_at),
    expires_at: toISOStringSafe(deleted.expires_at),
    used_at:
      deleted.used_at === null ? undefined : toISOStringSafe(deleted.used_at),
  };
}
