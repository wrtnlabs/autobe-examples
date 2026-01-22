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

export async function patchTodoAppUserUsersUserIdRoles(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserRole.IRequest;
}): Promise<ITodoAppUserRole> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own roles",
      403,
    );
  }
  const role = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { id: props.body.todo_app_role_id },
  });
  if (!role) throw new HttpException("Role not found", 404);
  await MyGlobal.prisma.todo_app_user_roles.deleteMany({
    where: { user: { id: props.userId } },
  });
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const newUserRole = await MyGlobal.prisma.todo_app_user_roles.create({
    data: {
      id: v4(),
      user: { connect: { id: props.userId } },
      role: { connect: { id: props.body.todo_app_role_id } },
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });
  return {
    id: newUserRole.id,
    user: {
      id: newUserRole.user.id,
      email: newUserRole.user.email as string & tags.Format<"email">,
      username: newUserRole.user.username,
      created_at: toISOStringSafe(newUserRole.user.created_at),
      updated_at:
        newUserRole.user.updated_at === null
          ? null
          : toISOStringSafe(newUserRole.user.updated_at),
      deleted_at:
        newUserRole.user.deleted_at === null
          ? null
          : toISOStringSafe(newUserRole.user.deleted_at),
    },
    role: {
      id: newUserRole.role.id,
      name: newUserRole.role.name,
      description: newUserRole.role.description,
    },
    created_at: toISOStringSafe(newUserRole.created_at),
    updated_at: toISOStringSafe(newUserRole.updated_at),
  };
}
