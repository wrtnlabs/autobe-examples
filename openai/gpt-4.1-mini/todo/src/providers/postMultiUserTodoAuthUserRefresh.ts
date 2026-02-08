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

export async function postMultiUserTodoAuthUserRefresh(props: {
  body: IMultiUserTodoUser.IRefresh;
}): Promise<IMultiUserTodoUser.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  let refreshToken: string;
  // Extract refresh token from body which is empty type - so this must be passed as header or elsewhere - but no other input is given.
  // Thus, we throw because we cannot get refresh token from props.body according to the type structure.
  throw new HttpException("Refresh token not provided in request body", 400);
  // The following code would be the implementation if refresh token was accessible:
  /*
    try {
      decoded = jwt.verify(
        refreshToken,
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe" }
      ) as { id: string; session_id: string; type: "user" };
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }

    if (decoded.type !== "user") {
      throw new HttpException("Invalid token type", 403);
    }

    const session = await MyGlobal.prisma.multi_user_todo_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_user_id: decoded.id
      },
    });

    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }

    const user = await MyGlobal.prisma.multi_user_todo_users.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new HttpException("User not found", 404);
    }

    if (user.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }

    const now = new Date();
    const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
    const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const accessExpiresISO = toISOStringSafe(accessExpires);
    const refreshExpiresISO = toISOStringSafe(refreshExpires);
    const nowISO = toISOStringSafe(now);

    const accessToken = jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" }
    );

    const refreshTokenNew = jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" }
    );

    await MyGlobal.prisma.multi_user_todo_user_sessions.update({
      where: { id: decoded.session_id },
      data: {
        expired_at: refreshExpiresISO,
      },
    });

    return {
      token: {
        access: accessToken,
        refresh: refreshTokenNew,
        expired_at: accessExpiresISO,
        refreshable_until: refreshExpiresISO,
      },
    };
    */
}
