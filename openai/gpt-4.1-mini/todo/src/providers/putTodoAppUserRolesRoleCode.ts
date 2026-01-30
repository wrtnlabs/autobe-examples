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

export async function putTodoAppUserRolesRoleCode(props: {
  user: UserPayload;
  roleCode: string & tags.Format<"uuid">;
  body: ITodoAppRole.IUpdate;
}): Promise<ITodoAppRole> {
  const updated = await MyGlobal.prisma.todo_app_roles.update({
    where: { id: props.roleCode },
    data: {
      name: props.body.name,
      description: props.body.description,
      created_at: props.body.created_at
        ? toISOStringSafe(props.body.created_at)
        : toISOStringSafe(new Date()),
      updated_at: props.body.updated_at
        ? toISOStringSafe(props.body.updated_at)
        : toISOStringSafe(new Date()),
      deleted_at:
        props.body.deleted_at === null
          ? null
          : toISOStringSafe(props.body.deleted_at!),
    },
  });
  if (!updated) {
    throw new HttpException("Role not found", 404);
  }
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at!),
    userRoles: [],
  };
}
