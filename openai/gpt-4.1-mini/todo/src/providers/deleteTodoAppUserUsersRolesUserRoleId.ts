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

export async function deleteTodoAppUserUsersRolesUserRoleId(props: {
  user: UserPayload;
  userRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the role exists
  const existing = await MyGlobal.prisma.todo_app_roles.findUnique({
    where: { id: props.userRoleId },
    select: { id: true },
  });
  if (!existing) {
    throw new HttpException(`User role not found: ${props.userRoleId}`, 404);
  }
  // Delete the user role
  await MyGlobal.prisma.todo_app_roles.delete({
    where: { id: props.userRoleId },
  });
}
