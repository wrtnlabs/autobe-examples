import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postMultiUserTodoAuthGuestRefresh(props: {
  body: IMultiUserTodoGuest.IRefresh;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  if (
    props.body.refreshToken === null ||
    props.body.refreshToken === undefined ||
    props.body.refreshToken === ""
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  let decoded: {
    type: string;
    id: string;
    session_id: string;
    created_at?: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as typeof decoded;
  } catch {
    throw new HttpException("Unauthorized", 401);
  }
  if (decoded.type !== "guest") {
    throw new HttpException("Unauthorized", 401);
  }
  const session =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_guest_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Unauthorized", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  const expiredAtIso = toISOStringSafe(new Date(session.expired_at));
  if (expiredAtIso <= nowIso) {
    throw new HttpException("Unauthorized", 401);
  }
  const refreshableUntilIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toISOStringSafe(d);
  })();
  const updatedAtIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.multi_user_todo_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshableUntilIso,
      updated_at: updatedAtIso,
    },
  });
  const accessExpiredIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return toISOStringSafe(d);
  })();
  const createdAtForToken = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "30m" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "30d" },
  );
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: accessExpiredIso as string & tags.Format<"date-time">,
      refreshable_until: refreshableUntilIso as string &
        tags.Format<"date-time">,
    },
  };
}
