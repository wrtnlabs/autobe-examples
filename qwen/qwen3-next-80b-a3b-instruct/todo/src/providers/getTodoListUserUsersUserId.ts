import { ArrayUtil } from "@nestia/e2e";
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

export async function getTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_user.findUniqueOrThrow({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  return {
    id: user.id,
    email: user.email,
    username: "",
    status: "active",
    created_at: toISOStringSafe(user.created_at),
    bio: "",
    timezone: "Asia/Seoul",
    language: "en-US",
  };
}
