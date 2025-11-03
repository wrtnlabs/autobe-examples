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

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  const { user, userId, body } = props;

  // Authorization: User can only update their own account
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own account",
      403,
    );
  }

  // Verify user exists and account is active
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: userId,
      deleted_at: null,
      status: "active",
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found or account is not active", 404);
  }

  // Validate email uniqueness if email is being changed
  if (body.email && body.email !== existingUser.email) {
    const conflictingUser = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
        id: { not: userId },
      },
    });

    if (conflictingUser) {
      throw new HttpException(
        "Email address is already in use by another account",
        409,
      );
    }
  }

  // Validate password complexity if password is provided
  if (body.password) {
    if (body.password.length < 8) {
      throw new HttpException(
        "Password must be at least 8 characters long",
        400,
      );
    }
    if (!/[A-Z]/.test(body.password)) {
      throw new HttpException(
        "Password must contain at least one uppercase letter",
        400,
      );
    }
    if (!/[a-z]/.test(body.password)) {
      throw new HttpException(
        "Password must contain at least one lowercase letter",
        400,
      );
    }
    if (!/[0-9]/.test(body.password)) {
      throw new HttpException("Password must contain at least one number", 400);
    }
  }

  // Prepare update data without satisfying ITodoAppUser.IUpdate
  const updateData: {
    email?: string & tags.Format<"email">;
    status?: "active" | "inactive" | "suspended";
    password_hash?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Add email if provided
  if (body.email !== undefined) {
    updateData.email = body.email;
  }

  // Add status if provided
  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  // Handle password hashing
  if (body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(body.password);
  }

  // Execute the update operation
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: userId },
    data: {
      email: updateData.email ?? undefined,
      password_hash: updateData.password_hash ?? undefined,
      status: updateData.status ?? undefined,
      updated_at: updateData.updated_at,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Convert Prisma result to API response format
  return {
    id: updatedUser.id as string & tags.Format<"uuid">,
    email: updatedUser.email as string & tags.Format<"email">,
    password_hash: updatedUser.password_hash ?? undefined,
    status: updatedUser.status,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : undefined,
  } satisfies ITodoAppUser;
}
