import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppPasswordResetsResetId(props: {
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserPasswordReset> {
  const resetRequest =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { id: props.resetId },
    });
  // Security: Treat non-existent and expired reset requests as non-existent
  if (
    !resetRequest ||
    toISOStringSafe(resetRequest.expired_at) <= toISOStringSafe(new Date())
  ) {
    throw new HttpException("Not Found", 404);
  }
  return TodoAppUserPasswordResetTransformer.transform(resetRequest);
}
