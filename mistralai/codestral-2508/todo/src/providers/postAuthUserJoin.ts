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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  // Check if user already exists
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already in use", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create the user
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Generate tokens
  const now = new Date();
  const accessTokenExpiresIn = "1h";
  const refreshTokenExpiresIn = "7d";

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  // Calculate expiration times
  const accessTokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  // Return authorized response
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiresAt),
      refreshable_until: toISOStringSafe(refreshTokenExpiresAt),
    } satisfies IAuthorizationToken,
  } satisfies ITodoListUser.IAuthorized;
}
