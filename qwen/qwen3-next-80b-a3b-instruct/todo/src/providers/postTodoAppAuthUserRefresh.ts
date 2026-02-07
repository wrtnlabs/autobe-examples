import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Verify refresh token: body is the refresh token string per spec
  const refreshToken = props.body as unknown as string;
  let decoded: {
    id: string;
    session_id: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
    }>(
      jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate user is not deleted
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 3. Create new access token (15min expiry)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // 4. Create new refresh token (7-day expiry)
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newRefreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return authorized response
  return {
    access: accessToken,
    refresh: newRefreshToken,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
