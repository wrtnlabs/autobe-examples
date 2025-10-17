import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  const { user, userId } = props;

  // Authorization: only owner allowed (admin path not available in props)
  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only access your own profile",
      403,
    );
  }

  try {
    const record = await MyGlobal.prisma.todo_app_user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
      },
    });

    if (record === null) {
      throw new HttpException("Not Found", 404);
    }

    return {
      id: record.id as string & tags.Format<"uuid">,
      email: record.email as string & tags.Format<"email">,
      display_name: record.display_name ?? null,
      account_status: record.account_status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      last_active_at: record.last_active_at
        ? toISOStringSafe(record.last_active_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
