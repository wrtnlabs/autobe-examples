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

export async function postTodoAppUserAuthUsersLogout(props: {
  user: UserPayload;
}): Promise<void> {
  try {
    const deleted = await MyGlobal.prisma.todo_app_user_sessions.delete({
      where: { id: props.user.session_id },
    });
  } catch (error) {
    throw new HttpException("Session not found or already logged out", 404);
  }
}
