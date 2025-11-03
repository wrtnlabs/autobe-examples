import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postTodoListAdminsLogin(props: {
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.ILoginResponse> {
  const { body } = props;

  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!admin) {
    throw new HttpException("Invalid email or password", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  const now = toISOStringSafe(new Date());

  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);
  const accessExpiredAt = toISOStringSafe(accessTokenExpiry);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);
  const refreshableUntil = toISOStringSafe(refreshTokenExpiry);

  const tokenPayload = {
    id: admin.id,
    role: "admin",
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
  });

  const refreshToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });

  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_admin_id: admin.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
    },
  });

  return {
    id: admin.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    email: admin.email as string & tags.Format<"email">,
    session_id: session.id as string & tags.Format<"uuid">,
  };
}
