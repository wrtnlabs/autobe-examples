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

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  try {
    // Step 1: Verify and decode refresh token
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "user";
      tokenType?: string;
    };

    // Verify this is a refresh token
    if (decoded.tokenType !== "refresh") {
      throw new HttpException("Invalid token type for refresh", 401);
    }

    // Verify payload matches the user making request
    if (
      decoded.id !== props.user.id ||
      decoded.session_id !== props.user.session_id
    ) {
      throw new HttpException("Token mismatch with current user", 401);
    }

    // Step 2: Validate user exists and is active
    const user = await MyGlobal.prisma.todo_users.findFirst({
      where: {
        id: decoded.id,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new HttpException("User not found or inactive", 404);
    }

    // Step 3: Generate new tokens with SAME session_id
    const accessExpires = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshExpires = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    const accessToken = jwt.sign(
      {
        type: props.user.type,
        id: props.user.id,
        session_id: props.user.session_id,
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
        type: props.user.type,
        id: props.user.id,
        session_id: props.user.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    // Step 4: Get user's task count
    const tasksCount = await MyGlobal.prisma.todo_tasks.count({
      where: {
        todo_user_id: user.id,
      },
    });

    // Step 5: Return new authorization
    return {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      mfa_enabled: user.mfa_enabled,
      failed_login_attempts: user.failed_login_attempts satisfies number,
      locked_until: user.locked_until
        ? toISOStringSafe(user.locked_until)
        : undefined,
      tasks_count: tasksCount satisfies number,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpires,
        refreshable_until: refreshExpires,
      },
    } satisfies ITodoUser.IAuthorized;
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new HttpException("Token not yet valid", 401);
    }
    throw error;
  }
}
