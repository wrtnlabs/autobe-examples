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

export async function putTodoAppUserRolesRoleCode(props: {
  user: UserPayload;
  roleCode: number &
    tags.Minimum<1> &
    tags.ExclusiveMaximum<0> &
    tags.MultipleOf<0.5>;
  body: ITodoAppRole.IUpdate;
}): Promise<ITodoAppRole> {
  const record = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { name: String(props.roleCode) },
  });
  if (!record) {
    throw new HttpException(`Role with code ${props.roleCode} not found`, 404);
  }
  const updated = await MyGlobal.prisma.todo_app_roles.update({
    where: { name: String(props.roleCode) },
    data: {
      name: props.body.name ?? record.name,
      description: props.body.description ?? record.description,
      created_at: toISOStringSafe(
        new Date(props.body.created_at ?? record.created_at),
      ) as string & tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at:
        props.body.deleted_at === undefined
          ? record.deleted_at !== null && record.deleted_at !== undefined
            ? (toISOStringSafe(new Date(record.deleted_at)) as string &
                tags.Format<"date-time">)
            : null
          : props.body.deleted_at
            ? (toISOStringSafe(new Date(props.body.deleted_at)) as string &
                tags.Format<"date-time">)
            : null,
    },
  });
  return await TodoAppRoleTransformer.transform({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
    todo_app_user_roles: undefined as never,
  });
}
