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

export async function putTodoAppUserUsersUserIdRolesUserRoleId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  userRoleId: string & tags.Format<"uuid">;
  body: ITodoAppUserRole.IUpdate;
}): Promise<ITodoAppUserRole> {
  // Verify the user role association exists
  const existingUserRole = await MyGlobal.prisma.todo_app_user_roles.findUnique(
    {
      where: { id: props.userRoleId },
    },
  );
  if (!existingUserRole || existingUserRole.todo_app_user_id !== props.userId) {
    throw new HttpException("User role assignment not found", 404);
  }
  // Verify the user exists and not soft-deleted
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
    select: { id: true, deleted_at: true },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found or has been deleted", 404);
  }
  const updateData: {
    todo_app_role_id?: string & tags.Format<"uuid">;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  // If a new role ID is provided in update payload, verify it exists
  if (props.body.todo_app_role_id !== undefined) {
    const role = await MyGlobal.prisma.todo_app_roles.findUnique({
      where: { id: props.body.todo_app_role_id },
      select: { id: true },
    });
    if (!role) {
      throw new HttpException("Role not found", 400);
    }
    updateData.todo_app_role_id = props.body.todo_app_role_id;
  }
  // Perform the update
  const updatedUserRole = await MyGlobal.prisma.todo_app_user_roles.update({
    where: { id: props.userRoleId },
    data: updateData,
  });
  // Retrieve with relations for transformation
  const freshUserRole = await MyGlobal.prisma.todo_app_user_roles.findUnique({
    where: { id: updatedUserRole.id },
    ...TodoAppUserRoleTransformer.select(),
  });
  if (!freshUserRole) {
    throw new HttpException("Updated user role assignment not found", 404);
  }
  return await TodoAppUserRoleTransformer.transform(freshUserRole);
}
