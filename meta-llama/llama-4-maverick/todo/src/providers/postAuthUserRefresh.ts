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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { user, body } = props;

  // Step 1: Verify refresh token
  let decoded: any;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpException("Refresh token has expired", 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpException("Invalid refresh token", 401);
    } else {
      throw new HttpException("Internal Server Error", 500);
    }
  }

  // Step 2: Retrieve user information
  const userFromDb = await MyGlobal.prisma.todo_list_users.findUniqueOrThrow({
    where: { id: decoded.userId },
  });

  // Step 3: Generate new tokens
  const newAccessToken = jwt.sign(
    {
      id: userFromDb.id,
      type: "user",
      username: userFromDb.username,
      created_at: toISOStringSafe(userFromDb.created_at),
      updated_at: toISOStringSafe(userFromDb.updated_at),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const newRefreshToken = jwt.sign(
    {
      userId: userFromDb.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 4: Prepare response
  return {
    id: userFromDb.id satisfies string as string & tags.Format<"uuid">,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)), // 1 hour from now
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ), // 7 days from now
    },
  } satisfies ITodoListUser.IAuthorized as ITodoListUser.IAuthorized;
}
