import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  // This operation assumes the userId parameter represents the authenticated user
  // In a real implementation, authentication context would be validated by middleware
  // and the userId would be extracted from the authenticated user's token
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: {
      id: props.userId,
      deleted_at: null, // Only return active users
    },
    ...TodoAppUserTransformer.select(),
  });
  return await TodoAppUserTransformer.transform(user);
}
