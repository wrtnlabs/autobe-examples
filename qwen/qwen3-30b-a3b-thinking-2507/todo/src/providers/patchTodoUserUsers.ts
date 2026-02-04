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
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserAtSummaryTransformer } from "../transformers/TodoUserAtSummaryTransformer";

export async function patchTodoUserUsers(props: {
  user: UserPayload;
  body: ITodoUser.IRequest;
}): Promise<IPageITodoUser.ISummary> {
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    include: {
      sessions: true,
      passwordResets: true,
      emailVerifications: true,
      todos: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const userSummary = await TodoUserAtSummaryTransformer.transform(user);
  return {
    data: [userSummary],
    pagination: {
      current: 1,
      limit: 20,
      records: 1,
      pages: 1,
    },
  };
}
