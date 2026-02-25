import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoUserUsers(props: {
  user: UserPayload;
}): Promise<void> {
  // Verify user exists, throws 404 if not
  await MyGlobal.prisma.multi_user_todo_users.findUniqueOrThrow({
    where: { id: props.user.id },
  });
  // Delete user with cascade delete of related entities
  await MyGlobal.prisma.multi_user_todo_users.delete({
    where: { id: props.user.id },
  });
}
