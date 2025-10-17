import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

export async function postTodoListAuthTokenRefresh(props: {
  body: ITodoListAuth.IRefreshTokenRequest;
}): Promise<ITodoListAuth.ITokenResponse> {
  const { body } = props;

  const now = toISOStringSafe(new Date());

  const potentialTokens =
    await MyGlobal.prisma.todo_list_refresh_tokens.findMany({
      where: {
        revoked_at: null,
        expires_at: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
    });

  let matchedToken = null;
  for (const token of potentialTokens) {
    const isValid = await PasswordUtil.verify(
      body.refresh_token,
      token.token_hash,
    );
    if (isValid) {
      matchedToken = token;
      break;
    }
  }

  if (!matchedToken) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (matchedToken.user.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 401);
  }

  const accessTokenExpiration = new Date();
  accessTokenExpiration.setMinutes(accessTokenExpiration.getMinutes() + 30);

  const jwtSecret = MyGlobal.env.JWT_SECRET_KEY;
  if (!jwtSecret) {
    throw new HttpException("JWT secret not configured", 500);
  }

  const accessToken = jwt.sign(
    {
      userId: matchedToken.user.id,
      email: matchedToken.user.email,
      role: "user",
    },
    jwtSecret,
    {
      expiresIn: "30m",
    },
  );

  return {
    access_token: accessToken,
    refresh_token: body.refresh_token,
    expires_at: toISOStringSafe(accessTokenExpiration),
  };
}
