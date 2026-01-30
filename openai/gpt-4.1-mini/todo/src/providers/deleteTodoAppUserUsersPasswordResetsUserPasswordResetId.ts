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

export async function deleteTodoAppUserUsersPasswordResetsUserPasswordResetId(props: {
  user: UserPayload;
  userPasswordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { id: props.userPasswordResetId },
      select: { id: true, todo_app_user_id: true },
    });
  if (!existing) {
    throw new HttpException("Password reset not found", 404);
  }
  if (existing.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - not the owner of this reset request",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_user_password_resets.delete({
    where: { id: props.userPasswordResetId },
  });
}
