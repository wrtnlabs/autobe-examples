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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUserPasswordResetsUserPasswordResetId(props: {
  user: UserPayload;
  userPasswordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { id: props.userPasswordResetId },
    });
  if (!existing) {
    throw new HttpException("User password reset not found", 404);
  }
  await MyGlobal.prisma.todo_app_user_password_resets.delete({
    where: { id: props.userPasswordResetId },
  });
}
