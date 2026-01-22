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

export async function deleteTodoAppUserUsersUserIdRolesUserRoleId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  userRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the user owns the roles being managed
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only manage your own roles",
      403,
    );
  }
  // Check existence of the user-role association
  const existing = await MyGlobal.prisma.todo_app_user_roles.findUnique({
    where: { id: props.userRoleId },
  });
  if (!existing || existing.todo_app_user_id !== props.userId) {
    throw new HttpException("User role association not found", 404);
  }
  // Delete the user-role association
  await MyGlobal.prisma.todo_app_user_roles.delete({
    where: { id: props.userRoleId },
  });
}
