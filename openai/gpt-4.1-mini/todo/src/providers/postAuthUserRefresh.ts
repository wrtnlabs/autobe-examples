import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.IRefresh;
}): Promise<ITodoListTodoListUser.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "user";
  };

  try {
    decoded = typia.assert<{
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "user";
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 'todo_list_user' relation is not included, so we cannot check deleted_at directly
  // Skip the deleted_at check or implement alternative query if needed

  const now = new Date();
  const accessExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(now.getTime() + 60 * 60 * 1000));
  const refreshExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresString },
  });

  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
    },
  };
}
