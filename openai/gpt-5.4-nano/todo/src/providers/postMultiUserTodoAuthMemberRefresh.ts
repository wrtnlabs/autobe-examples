import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthMemberRefresh(props: {
  body: IMultiUserTodoUserProfile.IRefresh;
}): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  type JwtMemberPayload = {
    type: "member";
    id: string;
    session_id: string;
    iat?: number;
    exp?: number;
  };
  const verified = (() => {
    try {
      return jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      return null;
    }
  })();
  if (verified === null || typeof verified !== "object") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  let payload: JwtMemberPayload;
  try {
    payload = typia.assert<JwtMemberPayload>(verified);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (
    payload.type !== "member" ||
    typeof payload.id !== "string" ||
    typeof payload.session_id !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const profile =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findUniqueOrThrow({
      where: { multi_user_todo_user_id: payload.id },
      select: {
        id: true,
        multi_user_todo_user_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (profile.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const expiredAt: string & tags.Format<"date-time"> =
    typeof payload.exp === "number"
      ? toISOStringSafe(new Date(payload.exp * 1000))
      : toISOStringSafe(new Date());
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: profile.id as IMultiUserTodoUserProfile.IAuthorized["id"],
    multi_user_todo_user_id:
      profile.multi_user_todo_user_id as IMultiUserTodoUserProfile.IAuthorized["multi_user_todo_user_id"],
    display_name: profile.display_name,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at:
      profile.deleted_at === null ? null : toISOStringSafe(profile.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
