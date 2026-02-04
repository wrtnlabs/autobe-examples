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
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserAtSummaryTransformer } from "../transformers/TodoUserAtSummaryTransformer";

export async function getTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoUser.ISummary> {
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only retrieve your own profile",
      403,
    );
  }
  const dbUser = await MyGlobal.prisma.todo_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    ...TodoUserAtSummaryTransformer.select(),
  });
  if (!dbUser) {
    throw new HttpException("User not found", 404);
  }
  return await TodoUserAtSummaryTransformer.transform(dbUser);
}
