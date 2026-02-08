import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoUserProfile(props: {
  user: UserPayload;
  body: IMultiUserTodoUser.IUpdate;
}): Promise<IMultiUserTodoUser> {
  const existingUser = await MyGlobal.prisma.multi_user_todo_users.findUnique({
    where: { id: props.user.id },
  });
  if (!existingUser) throw new HttpException("User not found", 404);
  // Since the only update is displayName which is not in the empty DTO, safely update if provided
  const updatedUser = await MyGlobal.prisma.multi_user_todo_users.update({
    where: { id: props.user.id },
    data: {
      // If displayName present in body, update display_name, else keep existing
      display_name:
        props.body &&
        Object.prototype.hasOwnProperty.call(props.body, "displayName")
          ? (props.body as any).displayName
          : existingUser.display_name,
    },
    select: {
      id: true,
      display_name: true,
      email: true,
      // Exclude sensitive fields like password_hash
    },
  });
  return updatedUser;
}
