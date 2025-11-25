import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserTwoFactorEnable(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.IEnableTwoFactor;
}): Promise<void> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });

  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found or inactive", 404);
  }

  if (props.body.two_factor_token !== (user as any).two_factor_secret) {
    throw new HttpException("Invalid two-factor authentication token", 403);
  }

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
