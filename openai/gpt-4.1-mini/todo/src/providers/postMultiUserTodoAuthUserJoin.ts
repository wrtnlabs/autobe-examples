import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthUserJoin(props: {
  body: IMultiUserTodoUser.IJoin;
}): Promise<IMultiUserTodoUser.IAuthorized> {
  const existing = await MyGlobal.prisma.multi_user_todo_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const nowISOString = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const userId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const user = await MyGlobal.prisma.multi_user_todo_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.displayName,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    },
  });
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.multi_user_todo_user_sessions.create({
    data: {
      id: sessionId,
      user: { connect: { id: userId } },
      expired_at: accessExpiredAt,
      href: props.body.href,
      referrer: props.body.referrer,
      ip: (props.body.ip ?? "") satisfies string as string,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  return {
    id: user.id,
    displayName: user.display_name,
    token,
  };
}
