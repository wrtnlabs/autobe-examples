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
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppRoleCollector } from "../collectors/TodoAppRoleCollector";
import { TodoAppRoleTransformer } from "../transformers/TodoAppRoleTransformer";

export async function postTodoAppUserRoles(props: {
  user: UserPayload;
  body: ITodoAppRole.ICreate;
}): Promise<ITodoAppRole> {
  const data = await TodoAppRoleCollector.collect({ body: props.body });
  const created = await MyGlobal.prisma.todo_app_roles.create({
    data: data,
    ...TodoAppRoleTransformer.select(),
  });
  return await TodoAppRoleTransformer.transform(created);
}
