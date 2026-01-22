import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";

export async function getTodoAppUserPasswordResetsUserPasswordResetId(props: {
  userPasswordResetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserPasswordReset> {
  const record = await MyGlobal.prisma.todo_app_user_password_resets.findUnique(
    {
      where: { id: props.userPasswordResetId },
      ...TodoAppUserPasswordResetTransformer.select(),
    },
  );
  if (!record) {
    throw new HttpException("User password reset record not found", 404);
  }
  return await TodoAppUserPasswordResetTransformer.transform(record);
}
