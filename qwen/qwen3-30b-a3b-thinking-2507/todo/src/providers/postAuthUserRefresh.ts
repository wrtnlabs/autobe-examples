import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  try {
    const refreshToken = (
      props.body as {
        refreshToken: string;
      }
    ).refreshToken;
    const decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "user";
    };
    // Verify session exists
    const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        user_id: decoded.id,
      },
    });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    // Verify user account is active
    const user = await MyGlobal.prisma.todo_users.findUniqueOrThrow({
      where: { id: decoded.id },
    });
    if (user.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    // Generate new tokens
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessToken = jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refreshTokenValue = jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    // Update session expiration
    await MyGlobal.prisma.todo_user_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    // Construct response with 'name' field included
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
      token: {
        access: accessToken,
        refresh: refreshTokenValue,
        expired_at: toISOStringSafe(accessExpires),
        refreshable_until: toISOStringSafe(refreshExpires),
      },
    };
  } catch (error) {
    throw new HttpException("Invalid refresh token", 401);
  }
}
