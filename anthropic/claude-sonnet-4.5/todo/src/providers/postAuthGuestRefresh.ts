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

export async function postAuthGuestRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  // Verify JWT signature and decode token
  let decoded: { userId: string; email: string; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { userId: string; email: string; type: string };
  } catch (error) {
    throw new HttpException("Invalid refresh token", 401);
  }

  if (!decoded.userId) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Find all refresh tokens for this user to verify against
  const userRefreshTokens =
    await MyGlobal.prisma.todo_list_refresh_tokens.findMany({
      where: {
        todo_list_user_id: decoded.userId,
        revoked_at: null,
      },
      include: {
        user: true,
      },
    });

  // Verify the provided token matches one of the stored hashes
  let matchedToken = null;
  for (const tokenRecord of userRefreshTokens) {
    const isMatch = await PasswordUtil.verify(
      body.refresh_token,
      tokenRecord.token_hash,
    );
    if (isMatch) {
      matchedToken = tokenRecord;
      break;
    }
  }

  if (!matchedToken) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Validate token not expired
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(matchedToken.expires_at);
  if (expiresAt < now) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Validate user account is active
  if (matchedToken.user.deleted_at !== null) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Generate new access token (30 minutes expiration)
  const accessTokenExpirationDate = new Date();
  accessTokenExpirationDate.setMinutes(
    accessTokenExpirationDate.getMinutes() + 30,
  );
  const accessTokenExpiration = toISOStringSafe(accessTokenExpirationDate);

  const accessToken = jwt.sign(
    {
      userId: matchedToken.user.id,
      email: matchedToken.user.email,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Token rotation: create new refresh token
  const refreshTokenExpirationDate = new Date();
  refreshTokenExpirationDate.setDate(refreshTokenExpirationDate.getDate() + 30);
  const refreshTokenExpiration = toISOStringSafe(refreshTokenExpirationDate);

  const newRefreshTokenValue = jwt.sign(
    {
      userId: matchedToken.user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshTokenValue);
  const newRefreshTokenId = v4();

  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: newRefreshTokenId,
      todo_list_user_id: matchedToken.user.id,
      token_hash: newRefreshTokenHash,
      expires_at: refreshTokenExpiration,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Revoke old refresh token
  await MyGlobal.prisma.todo_list_refresh_tokens.update({
    where: { id: matchedToken.id },
    data: { revoked_at: toISOStringSafe(new Date()) },
  });

  // Return authorization response
  return {
    id: matchedToken.user.id,
    token: {
      access: accessToken,
      refresh: newRefreshTokenValue,
      expired_at: accessTokenExpiration,
      refreshable_until: refreshTokenExpiration,
    },
  };
}
