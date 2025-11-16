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
  // 1. Hash the submitted refresh token
  const hashedRefreshToken = await PasswordUtil.hash(props.body);

  // 2. Find matching user with valid refresh token (not expired)
  const now = toISOStringSafe(new Date());
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      refreshTokenHash: hashedRefreshToken,
      refreshTokenExpiresAt: {
        gt: now,
      },
    } as Prisma.todo_list_usersWhereInput,
  });

  if (!user) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 3. Generate new tokens
  const nowDate = new Date();
  const accessExpires = toISOStringSafe(
    new Date(nowDate.getTime() + 15 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      id: user.id,
      type: "user",
      created_at: toISOStringSafe(nowDate),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: user.id,
      type: "user",
      created_at: toISOStringSafe(nowDate),
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 4. Generate new refresh token and update user record
  const newRefreshToken = v4();
  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshToken);

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      refreshTokenExpiresAt: refreshExpires,
    } as Prisma.todo_list_usersUpdateInput,
  });

  // 5. Return new tokens
  return {
    id: user.id,
    token: {
      access,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
