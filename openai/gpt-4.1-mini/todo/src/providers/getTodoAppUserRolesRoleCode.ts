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

export async function getTodoAppUserRolesRoleCode(props: {
  user: UserPayload;
  roleCode: number & tags.Minimum<1> & tags.Maximum<128> & tags.MultipleOf<1>;
}): Promise<ITodoAppRole> {
  const roleName = String(props.roleCode);
  const record = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { name: roleName },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!record) {
    throw new HttpException(
      `Role not found with roleCode ${props.roleCode}`,
      404,
    );
  }
  // Since todo_app_user_roles relation does not exist, userRoles must be empty array
  // or according to business logic, use empty array.
  return {
    id: record.id as string & tags.Format<"uuid">,
    role_code: record.name,
    description: record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    userRoles: [],
  };
}
