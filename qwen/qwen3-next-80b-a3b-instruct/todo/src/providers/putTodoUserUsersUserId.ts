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
  // Authorization: Only the user themselves can update their account (or admin in future)
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own account.",
      403,
    );
  }

  // Find user, must not be soft-deleted
  const existing = await MyGlobal.prisma.todo_user.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or deleted.", 404);
  }

  // Only allow email and password_hash update
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.email === "string") {
    updateData.email = props.body.email;
  }
  if (typeof props.body.password_hash === "string") {
    updateData.password_hash = props.body.password_hash;
  }

  let updated;
  try {
    updated = await MyGlobal.prisma.todo_user.update({
      where: { id: props.userId },
      data: updateData,
    });
  } catch (err: any) {
    if (
      typeof err === "object" &&
      err !== null &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("email")
    ) {
      throw new HttpException("Email address already in use.", 409);
    }
    throw err;
  }

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
