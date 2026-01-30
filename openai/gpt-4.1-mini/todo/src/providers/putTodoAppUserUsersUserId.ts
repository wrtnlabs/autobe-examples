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
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden: Cannot update other users", 403);
  }
  const existing = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or has been deleted", 404);
  }
  const updateData: Partial<{
    email: string & tags.Format<"email">;
    username: string;
    password_hash: string;
    updated_at: string & tags.Format<"date-time">;
  }> = {};
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.username !== undefined) {
    updateData.username = props.body.username;
  }
  if (props.body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }
  updateData.updated_at = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
  });
  return await TodoAppUserTransformer.transform(updated);
}
