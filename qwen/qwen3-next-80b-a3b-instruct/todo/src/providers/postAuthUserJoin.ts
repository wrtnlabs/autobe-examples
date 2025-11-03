import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserJoin(props: {
  user: UserPayload;
  email: string & tags.Format<"email"> & tags.MinLength<1>;
  password: string & tags.MinLength<8> & tags.MaxLength<128>;
  body: ITodoUser.IJoin;
}): Promise<ITodoUser.IAuthorized> {
  // Extract the email and password from body
  const { email, password } = props.body;

  // Verify that the email doesn't already exist
  const existingUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(password);

  // Create the new user record
  const newUser = await MyGlobal.prisma.todo_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create the session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: newUser.id,
      ip: props.user ? props.user.id : "0.0.0.0",
      href: "https://example.com/auth/join",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: newUser.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
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
      id: newUser.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized response
  return {
    id: newUser.id,
    email: newUser.email,
    created_at: toISOStringSafe(newUser.created_at),
    updated_at: toISOStringSafe(newUser.updated_at),
    deleted_at: toISOStringSafe(newUser.deleted_at ?? new Date(0)),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoUser.IAuthorized;
}
