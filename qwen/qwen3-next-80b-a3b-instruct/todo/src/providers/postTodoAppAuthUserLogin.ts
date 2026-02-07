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

export async function postTodoAppAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Cast to any to access email and password properties from empty ILogin
  const bodyAny = props.body as any;
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { email: bodyAny.email },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const isValid = await PasswordUtil.verify(
    bodyAny.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      id: user.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      id: user.id,
      type: "user",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Ensure date-time format types correctly
  const expiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshableUntil: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  return {
    access,
    refresh,
    token: {
      access,
      refresh,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  } satisfies ITodoAppUser.IAuthorized;
}
