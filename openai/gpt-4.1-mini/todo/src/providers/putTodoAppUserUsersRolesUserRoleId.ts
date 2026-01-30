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
import { TodoAppUserRoleTransformer } from "../transformers/TodoAppUserRoleTransformer";

export async function putTodoAppUserUsersRolesUserRoleId(props: {
  user: UserPayload;
  userRoleId: string & tags.Format<"uuid">;
  body: ITodoAppUserRole.IUpdate;
}): Promise<ITodoAppUserRole> {
  const existing = await MyGlobal.prisma.todo_app_user_roles.findUnique({
    where: { id: props.userRoleId },
  });
  if (!existing) {
    throw new HttpException("User role not found", 404);
  }
  const updatedRaw = await MyGlobal.prisma.todo_app_user_roles.update({
    where: { id: props.userRoleId },
    data: {
      ...(props.body.todoAppUserId !== undefined && {
        todo_app_user_id: props.body.todoAppUserId,
      }),
      ...(props.body.todoAppRoleId !== undefined && {
        todo_app_role_id: props.body.todoAppRoleId,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      user: true,
      role: true,
    },
  });
  return await TodoAppUserRoleTransformer.transform(updatedRaw);
}
