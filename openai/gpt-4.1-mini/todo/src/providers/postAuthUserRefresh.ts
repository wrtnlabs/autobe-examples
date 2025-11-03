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
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string;
    session_id: string;
    type: "user";
  };

  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
    },
    include: {
      todoUser: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.todoUser.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  await MyGlobal.prisma.todo_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: decoded.id,
    token: token,
  };
}
