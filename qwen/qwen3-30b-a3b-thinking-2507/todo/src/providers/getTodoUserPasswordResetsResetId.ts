import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserPasswordResetTransformer } from "../transformers/TodoUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoUserPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.todo_user_password_resets.findUnique({
      where: {
        id: props.resetId,
        todo_user_id: props.user.id,
      },
      ...TodoUserPasswordResetTransformer.select(),
    });
  if (!resetRecord) {
    throw new HttpException("Password reset record not found", 404);
  }
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(resetRecord.expires_at) < now) {
    throw new HttpException("Reset token expired", 400);
  }
  if (resetRecord.used_at !== null) {
    throw new HttpException("Reset token already used", 400);
  }
  return await TodoUserPasswordResetTransformer.transform(resetRecord);
}
