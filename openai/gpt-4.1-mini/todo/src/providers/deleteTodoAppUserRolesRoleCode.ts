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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserRolesRoleCode(props: {
  user: UserPayload;
  roleCode: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the role exists by id (using props.roleCode as id)
  const existing = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { id: props.roleCode },
  });
  if (!existing) {
    throw new HttpException("Role not found", 404);
  }
  // Delete the role
  await MyGlobal.prisma.todo_app_roles.delete({
    where: { id: props.roleCode },
  });
}
