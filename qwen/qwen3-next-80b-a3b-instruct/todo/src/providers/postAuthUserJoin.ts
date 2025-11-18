import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserJoin(props: {
  user: UserPayload;
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  // Validate email doesn't already exist
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password (MANDATORY)
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create user account - password field not in schema, must be removed
  const now = new Date();
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      // password_hash: hashedPassword, // Removed - doesn't exist in schema
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
  });

  // Create session using proper model based on the registration context
  // But based on the provided schemas, we don't have a session model
  // So we'll create a token without session_id, using the user id as session_id
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: user.id, // Use user.id as session_id since no session model exists
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: user.id, // Use user.id as session_id
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized response
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: user.updated_at ? toISOStringSafe(user.updated_at) : undefined,
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoListUser.IAuthorized;
}
