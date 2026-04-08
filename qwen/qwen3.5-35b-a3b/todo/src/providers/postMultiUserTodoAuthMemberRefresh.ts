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
  let tokenPayload: {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
    tokenType?: string;
  };
  try {
    tokenPayload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      type: string;
      id: string;
      session_id: string;
      created_at: string;
      tokenType?: string;
    };
  } catch {
    throw new HttpException("Invalid refresh token", 401);
  }
  if (tokenPayload.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  if (tokenPayload.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 401);
  }
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        id: tokenPayload.session_id,
        multi_user_todo_member_id: tokenPayload.id,
      },
      select: {
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at <= new Date()) {
    throw new HttpException("Session expired", 401);
  }
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: tokenPayload.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "60m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: tokenPayload.session_id },
    data: { expired_at: refreshExpires },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const memberCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    member.created_at,
  );
  const memberUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    member.updated_at,
  );
  const memberDeletedAt: (string & tags.Format<"date-time">) | null =
    member.deleted_at ? toISOStringSafe(member.deleted_at) : null;
  const memberUuid: string & tags.Format<"uuid"> = member.id as string &
    tags.Format<"uuid">;
  return {
    id: memberUuid,
    email: member.email,
    created_at: memberCreatedAt,
    updated_at: memberUpdatedAt,
    deleted_at: memberDeletedAt,
    token: token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
