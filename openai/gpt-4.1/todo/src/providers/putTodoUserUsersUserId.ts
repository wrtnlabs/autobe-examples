import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own account.", 403);
  }
  const existing = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found.", 404);
  }
  try {
    const updated = await MyGlobal.prisma.todo_users.update({
      where: { id: props.userId },
      data: {
        ...(typeof props.body.email !== "undefined" && {
          email: props.body.email,
        }),
        ...(typeof props.body.password !== "undefined" && {
          password_hash: await PasswordUtil.hash(props.body.password),
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002" &&
      "meta" in err &&
      Array.isArray((err as any).meta?.target) &&
      (err as any).meta.target.includes("email")
    ) {
      throw new HttpException("This email address is already in use.", 409);
    }
    throw err;
  }
}
