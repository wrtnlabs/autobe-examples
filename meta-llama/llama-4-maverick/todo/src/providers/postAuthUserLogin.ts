import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: IUser.ILogin;
}): Promise<IUser.IAuthorized> {
  const { body } = props;
  if (
    typeof body !== "object" ||
    !("username" in body) ||
    !("password" in body)
  ) {
    throw new HttpException("Invalid credentials", 400);
  }

  const { username, password } = body;

  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      username: username,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const response: IUser.IAuthorized = {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600000)),
      refreshable_until: toISOStringSafe(new Date(Date.now() + 604800000)),
    },
  };
  return response;
}
