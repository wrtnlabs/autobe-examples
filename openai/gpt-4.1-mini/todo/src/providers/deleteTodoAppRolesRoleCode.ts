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

export async function deleteTodoAppRolesRoleCode(props: {
  roleCode: number &
    tags.ExclusiveMinimum<0> &
    tags.ExclusiveMaximum<0> &
    tags.MultipleOf<0.01>;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { code: props.roleCode },
  });
  if (!existing) {
    throw new HttpException("Role not found", 404);
  }
  await MyGlobal.prisma.todo_app_roles.delete({
    where: { code: props.roleCode },
  });
}
