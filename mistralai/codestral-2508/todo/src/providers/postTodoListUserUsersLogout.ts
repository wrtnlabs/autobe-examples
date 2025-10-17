import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserUsersLogout(props: {
  user: UserPayload;
}): Promise<void> {
  // Verify user exists, is authorized, and is active
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found or already logged out", 404);
  }

  // Perform hard delete by updating deleted_at timestamp
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Clear authentication token - implementation depends on your auth system
  // This is a placeholder - adjust based on your actual token management
  // Typically you would:
  // 1. Invalidate the token in your token store
  // 2. Clear any session data
  // 3. Set appropriate response headers

  // For JWT, you might want to add the token to a blacklist
  // or set a short expiration

  // Example for JWT:
  // const token = request.headers.authorization?.split(' ')[1];
  // if (token) {
  //   await MyGlobal.prisma.token_blacklist.create({
  //     data: {
  //       token,
  //       expires_at: toISOStringSafe(new Date(Date.now() + 3600000)), // 1 hour
  //     },
  //   });
  // }

  // For session-based systems, you would typically:
  // 1. Clear the session cookie
  // 2. Invalidate the session in your session store

  // Since we don't have access to the request object in this context,
  // we'll need to implement a more generic approach

  // Add logging for audit purposes
  console.log(
    `User ${props.user.id} logged out at ${new Date().toISOString()}`,
  );

  return;
}
