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

export async function postMultiUserTodoAuthMemberJoin(props: {
  ip: string;
  body: IMultiUserTodoUserProfile.IJoin;
}): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  const displayName = props.body.display_name;
  const password = props.body.password;
  if (displayName.length < 1) {
    throw new HttpException("Invalid display_name", 400);
  }
  if (password.length < 1) {
    throw new HttpException("Invalid password", 400);
  }
  const profileId = typia.assert<string & tags.Format<"uuid">>(v4());
  const userId = typia.assert<string & tags.Format<"uuid">>(v4());
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date()),
  );
  try {
    await PasswordUtil.hash(password);
    await MyGlobal.prisma.multi_user_todo_user_profiles.create({
      data: {
        id: profileId,
        multi_user_todo_user_id: userId,
        display_name: displayName,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (
      message.toLowerCase().includes("unique") ||
      message.toLowerCase().includes("constraint")
    ) {
      throw new HttpException("Registration conflict", 409);
    }
    throw new HttpException("Unexpected server error", 500);
  }
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: userId,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: userId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: createdAt,
    refreshable_until: createdAt,
  } satisfies IAuthorizationToken;
  return {
    id: profileId,
    multi_user_todo_user_id: userId,
    display_name: displayName,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
    token,
  };
}
