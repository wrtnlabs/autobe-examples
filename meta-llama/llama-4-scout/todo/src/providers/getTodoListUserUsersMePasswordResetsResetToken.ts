import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersMePasswordResetsResetToken(props: {
  user: UserPayload;
  resetToken: string;
}): Promise<ITodoListUserPasswordReset> {
  const entity = await MyGlobal.prisma.todo_list_user_password_resets.findFirst(
    {
      where: {
        reset_token: props.resetToken,
        todo_list_user_id: props.user.id,
      },
    },
  );

  if (!entity) {
    throw new HttpException(
      "Reset event not found for this user or token is invalid.",
      404,
    );
  }

  return {
    id: entity.id,
    todo_list_user_id: entity.todo_list_user_id,
    reset_token: entity.reset_token,
    consumed_at: entity.consumed_at
      ? toISOStringSafe(entity.consumed_at)
      : undefined,
    expires_at: toISOStringSafe(entity.expires_at),
    created_at: toISOStringSafe(entity.created_at),
  };
}
