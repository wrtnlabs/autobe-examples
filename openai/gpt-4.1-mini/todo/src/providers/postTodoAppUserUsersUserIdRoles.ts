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
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserRoleCollector } from "../collectors/TodoAppUserRoleCollector";
import { TodoAppUserRoleTransformer } from "../transformers/TodoAppUserRoleTransformer";

export async function postTodoAppUserUsersUserIdRoles(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserRole.ICreate;
}): Promise<ITodoAppUserRole> {
  // Check the target user existence
  const targetUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
    select: { id: true },
  });
  if (!targetUser) {
    throw new HttpException(`User not found: ${props.userId}`, 404);
  }
  // Create the user role using collector to construct Prisma CreateInput
  const created = await MyGlobal.prisma.todo_app_user_roles.create({
    data: await TodoAppUserRoleCollector.collect({
      body: props.body,
      todoAppUsers: { id: props.userId },
    }),
    ...TodoAppUserRoleTransformer.select(),
  });
  // Transform and format created entity response
  return await TodoAppUserRoleTransformer.transform(created);
}
