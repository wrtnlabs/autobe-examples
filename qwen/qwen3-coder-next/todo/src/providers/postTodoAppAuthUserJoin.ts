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

export async function postTodoAppAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: "" },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: "",
      password_hash: await PasswordUtil.hash(""),
      display_name: "",
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      ip: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      session_id: v4(),
      access_token: "",
      refresh_token: "",
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
