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

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: body.email.toLowerCase(),
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  const accessTokenExpiry = new Date();
  accessTokenExpiry.setHours(accessTokenExpiry.getHours() + 1);

  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "user",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  const refreshTokenHash = await PasswordUtil.hash(refreshToken);

  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiry),
      created_at: toISOStringSafe(new Date()),
      revoked_at: null,
    },
  });

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
