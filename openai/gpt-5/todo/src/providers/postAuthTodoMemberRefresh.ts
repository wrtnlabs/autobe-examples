import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMemberRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRefresh";
import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoMemberRefresh(props: {
  body: ITodoListTodoMemberRefresh.ICreate;
}): Promise<ITodoListTodoMember.IAuthorized> {
  const { refresh_token } = props.body;

  // 1) Verify and decode the refresh token
  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_err) {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Unauthorized: Invalid token payload", 401);
  }

  const subjectId =
    typeof decoded["id"] === "string" ? decoded["id"] : undefined;
  const payloadType = decoded["type"];

  if (!subjectId || payloadType !== "todomember") {
    throw new HttpException("Unauthorized: Invalid token subject", 401);
  }

  // 2) Load member and ensure active (deleted_at is null)
  const member = await MyGlobal.prisma.todo_list_todo_members.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!member) {
    throw new HttpException("Unauthorized: Account not found", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Forbidden: Account deactivated", 403);
  }

  // 3) Generate new access token with SAME payload structure
  const accessPayload = {
    id: member.id as string & tags.Format<"uuid">,
    type: "todomember",
    email: member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };

  const ACCESS_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
  const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: Math.floor(ACCESS_EXPIRES_MS / 1000),
    issuer: "autobe",
  });

  // Optional rotation policy: here we DO NOT rotate to avoid persistence needs
  const refreshToken = refresh_token;

  const nowMs = Date.now();
  const expired_at = toISOStringSafe(new Date(nowMs + ACCESS_EXPIRES_MS));
  const refreshable_until = toISOStringSafe(
    new Date(nowMs + REFRESH_EXPIRES_MS),
  );

  // 4) Return authorized payload
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
