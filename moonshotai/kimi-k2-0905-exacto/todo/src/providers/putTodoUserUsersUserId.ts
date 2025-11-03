import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  // Authorization check - user can only update their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own account",
      403,
    );
  }

  // Check email uniqueness if email is being updated
  if (props.body.email !== undefined && props.body.email !== null) {
    const existingUser = await MyGlobal.prisma.todo_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
        deleted_at: null,
      },
    });

    if (existingUser) {
      throw new HttpException(
        "Email address is already in use by another account",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  // Build update data with only provided fields
  const updateData = {
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: props.body.email,
      }),
    ...(props.body.password !== undefined &&
      props.body.password !== null && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
    updated_at: now,
  } satisfies Prisma.todo_usersUpdateInput;

  const updatedUser = await MyGlobal.prisma.todo_users.update({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    data: updateData,
    select: {
      id: true,
      email: true,
      mfa_enabled: true,
      failed_login_attempts: true,
      locked_until: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Get tasks count
  const tasksCount = await MyGlobal.prisma.todo_tasks.count({
    where: { todo_user_id: props.userId },
  });

  return {
    id: updatedUser.id as string & tags.Format<"uuid">,
    email: updatedUser.email,
    mfa_enabled: updatedUser.mfa_enabled,
    failed_login_attempts: updatedUser.failed_login_attempts,
    locked_until:
      updatedUser.locked_until !== null
        ? toISOStringSafe(updatedUser.locked_until)
        : null,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    tasks_count: tasksCount,
  } satisfies ITodoUser;
}
