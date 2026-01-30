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
import { TodoAppRoleTransformer } from "../transformers/TodoAppRoleTransformer";

export async function getTodoAppUserRolesRoleCode(props: {
  user: UserPayload;
  roleCode: string & tags.Format<"uuid">;
}): Promise<ITodoAppRole> {
  const role = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { id: props.roleCode },
    ...TodoAppRoleTransformer.select(),
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  return await TodoAppRoleTransformer.transform(role);
}
