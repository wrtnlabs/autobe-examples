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

export async function postTodoAppUserUsersRoles(props: {
  user: UserPayload;
  body: ITodoAppUserRole.ICreate;
}): Promise<ITodoAppUserRole> {
  const data = await TodoAppUserRoleCollector.collect({ body: props.body });
  const created = await MyGlobal.prisma.todo_app_user_roles.create({
    data,
    ...TodoAppUserRoleTransformer.select(),
  });
  return await TodoAppUserRoleTransformer.transform(created);
}
