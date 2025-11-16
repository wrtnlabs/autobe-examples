import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // 1. Auth: Only the authenticated user can update themselves
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own account.",
      403,
    );
  }

  // 2. Find existing user
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found.", 404);
  }

  // 3. Ensure at least one updatable field is present
  const wantsToUpdateEmail = typeof props.body.email !== "undefined";
  const wantsToUpdatePassword = typeof props.body.password !== "undefined";
  if (!wantsToUpdateEmail && !wantsToUpdatePassword) {
    throw new HttpException(
      "Must provide email and/or password to update.",
      400,
    );
  }

  // 4. If updating email, check uniqueness
  if (wantsToUpdateEmail) {
    const emailConflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email!,
        id: { not: props.userId },
      },
      select: { id: true },
    });
    if (emailConflict) {
      throw new HttpException("Email already in use.", 409);
    }
  }

  // 5. Prepare update data
  const updateData: Record<string, unknown> = {};
  if (wantsToUpdateEmail) {
    updateData.email = props.body.email;
  }
  if (wantsToUpdatePassword) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password!);
  }

  // 6. Write update
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // 7. Return only id and email as per ITodoListUser definition
  return {
    id: updated.id,
    email: updated.email,
  };
}
