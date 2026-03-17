import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new Error("invalid");
    }
    if (
      !("id" in verified) ||
      !("session_id" in verified) ||
      !("type" in verified) ||
      typeof verified.id !== "string" ||
      typeof verified.session_id !== "string" ||
      typeof verified.type !== "string"
    ) {
      throw new Error("invalid");
    }
    decoded = {
      id: verified.id,
      session_id: verified.session_id,
      type: verified.type,
      tokenType:
        "tokenType" in verified && typeof verified.tokenType === "string"
          ? verified.tokenType
          : undefined,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  if (decoded.tokenType !== undefined && decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_member_id: decoded.id,
    },
    select: {
      id: true,
      expired_at: true,
      member: TodoAppMemberTransformer.select(),
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= new globalThis.Date().getTime()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await TodoAppMemberTransformer.transform(session.member);
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowMilliseconds = globalThis.Date.now();
  const accessExpiredAt = new globalThis.Date(
    nowMilliseconds + 60 * 60 * 1000,
  ).toISOString();
  const refreshableUntil = new globalThis.Date(
    nowMilliseconds + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAt = new globalThis.Date(nowMilliseconds).toISOString();
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new globalThis.Date(refreshableUntil),
    },
  });
  return {
    ...member,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
