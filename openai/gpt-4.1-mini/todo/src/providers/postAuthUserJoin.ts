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

export async function postAuthUserJoin(props: {
  user: UserPayload;
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (existing !== null) {
    throw new HttpException("Email is already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const id = v4() as string & tags.Format<"uuid">;

  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpireIso = toISOStringSafe(accessExpires) as string &
    tags.Format<"date-time">;
  const refreshExpireIso = toISOStringSafe(refreshExpires) as string &
    tags.Format<"date-time">;

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpireIso,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpireIso,
    refreshable_until: refreshExpireIso,
  };

  return {
    id: user.id,
    token,
  };
}
