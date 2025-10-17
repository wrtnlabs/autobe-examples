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
  const { body } = props;

  let decoded;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const userIdCandidate = (decoded as { id?: unknown }).id;
  if (typeof userIdCandidate !== "string") {
    throw new HttpException("Invalid token payload", 401);
  }
  const userId = userIdCandidate;

  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found or deleted", 401);
  }

  const now = Date.now();

  return {
    id: user.id,
    token: {
      access: jwt.sign(
        {
          id: user.id,
          type: "user",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          id: user.id,
          type: "user",
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: toISOStringSafe(new Date(now + 60 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(now + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
