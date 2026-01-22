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

export async function getTodoAppUserUsersUserIdRolesUserRoleId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  userRoleId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserRole> {
  // Check authorization: user can only access their own roles
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the user role assignment by composite keys userId and userRoleId
  const userRole = await MyGlobal.prisma.todo_app_user_roles.findUnique({
    where: {
      id: props.userRoleId,
    },
    ...TodoAppUserRoleTransformer.select(),
  });
  if (!userRole || userRole.user.id !== props.userId) {
    throw new HttpException("User role not found", 404);
  }
  // Transform database record to API response
  return await TodoAppUserRoleTransformer.transform(userRole);
}
