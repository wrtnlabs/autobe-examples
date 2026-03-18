import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
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
  body: IMultiUserTodoMember.IRefresh;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  const nowIso = toISOStringSafe(new Date());
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const maybeType: unknown = (
    decoded as unknown as {
      type?: unknown;
    }
  ).type;
  const maybeId: unknown = (
    decoded as unknown as {
      id?: unknown;
    }
  ).id;
  const maybeSessionId: unknown = (
    decoded as unknown as {
      session_id?: unknown;
    }
  ).session_id;
  if (
    maybeType !== "member" ||
    typeof maybeId !== "string" ||
    typeof maybeSessionId !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        id: maybeSessionId,
        multi_user_todo_member_id: maybeId,
        expired_at: {
          gt: new Date(nowIso),
        },
      },
      select: {
        id: true,
        multi_user_todo_member_id: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: maybeId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpMillis = Date.now() + 60 * 60 * 1000;
  const refreshableMillis = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiredIso = toISOStringSafe(new Date(accessExpMillis));
  const refreshableUntilIso = toISOStringSafe(new Date(refreshableMillis));
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(refreshableUntilIso),
    },
  });
  return {
    id: member.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
