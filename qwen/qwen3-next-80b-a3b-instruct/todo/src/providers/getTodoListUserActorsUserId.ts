import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserActorsUserId(props: {
  user: UserPayload;
  userId: string;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_user.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return user.id;
}
