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
  // Extract and verify JWT token from the body (string)
  try {
    const decoded = jwt.verify(props.body, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string & tags.Format<"uuid">; type: "user" };

    // Validate the token is for a user
    if (decoded.type !== "user") {
      throw new HttpException("Invalid token type", 401);
    }

    // Get user by ID
    const user = await MyGlobal.prisma.todo_list_users.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new HttpException("User not found", 401);
    }

    // Generate new token expiry dates
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Generate new tokens
    const accessToken = jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: user.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: user.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    // Return successful authentication
    return {
      id: user.id,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: toISOStringSafe(accessExpires),
        refreshable_until: toISOStringSafe(refreshExpires),
      },
    } satisfies ITodoListUser.IAuthorized;
  } catch (error) {
    throw new HttpException("Invalid credentials", 401);
  }
}
