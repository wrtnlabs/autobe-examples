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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListUserTransformer } from "../transformers/TodoListUserTransformer";

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Validate that authenticated user matches target user ID
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot update another user's profile",
      403,
    );
  }
  // Update user record with new email and updated_at timestamp
  const updated = await MyGlobal.prisma.todo_list_user.update({
    where: { id: props.userId },
    data: {
      email: props.body.email,
      updated_at: toISOStringSafe(new Date()),
    },
    ...TodoListUserTransformer.select(),
  });
  // Return updated user object transformed to API DTO
  return await TodoListUserTransformer.transform(updated);
}
