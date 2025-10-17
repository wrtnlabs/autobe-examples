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

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  // Verify and decode the refresh token
  let decoded: { userId: string; tokenType?: string };
  try {
    const verifiedToken = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    decoded = verifiedToken as { userId: string; tokenType?: string };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (!decoded.userId) {
    throw new HttpException("Invalid token payload", 401);
  }

  // Verify user exists and is active
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: decoded.userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User account not found or inactive", 403);
  }

  // Find all non-revoked refresh tokens for this user
  const storedTokens = await MyGlobal.prisma.todo_list_refresh_tokens.findMany({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
  });

  // Verify the provided token against stored hashes
  let validStoredToken = null;
  for (const token of storedTokens) {
    const isValid = await PasswordUtil.verify(
      body.refresh_token,
      token.token_hash,
    );
    if (isValid) {
      validStoredToken = token;
      break;
    }
  }

  if (!validStoredToken) {
    throw new HttpException("Refresh token not found or has been revoked", 404);
  }

  // Prepare current timestamp
  const currentTime = new Date();
  const nowISO = toISOStringSafe(currentTime);

  // Check if token has expired
  const tokenExpiryISO = toISOStringSafe(validStoredToken.expires_at);
  if (tokenExpiryISO <= nowISO) {
    throw new HttpException("Refresh token has expired", 401);
  }

  // Calculate expiry times
  const accessTokenExpiry = new Date(currentTime.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(
    currentTime.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const accessExpiryISO = toISOStringSafe(accessTokenExpiry);
  const refreshExpiryISO = toISOStringSafe(refreshTokenExpiry);

  // Generate new access token (30 minutes)
  const accessToken = jwt.sign(
    {
      userId: user.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Generate new refresh token (30 days)
  const newRefreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Hash the new refresh token for storage
  const newTokenHash = await PasswordUtil.hash(newRefreshToken);

  // Revoke the old refresh token
  await MyGlobal.prisma.todo_list_refresh_tokens.update({
    where: { id: validStoredToken.id },
    data: {
      revoked_at: nowISO,
    },
  });

  // Create new refresh token record (id field required - no @default)
  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      token_hash: newTokenHash,
      expires_at: refreshExpiryISO,
      created_at: nowISO,
      revoked_at: null,
    },
  });

  // Return authorized response
  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiryISO,
      refreshable_until: refreshExpiryISO,
    },
  };
}
