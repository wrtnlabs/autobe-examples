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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  type DecodedRefreshToken = {
    id: string;
    session_id: string;
    type: "member";
    tokenType?: "refresh";
    created_at: string;
    iat?: number;
    exp?: number;
    iss?: string;
  };
  const decoded: DecodedRefreshToken = (() => {
    try {
      const payload: string | jwt.JwtPayload = jwt.verify(
        props.body.refresh,
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe" },
      );
      if (typeof payload === "string") throw new Error("invalid token");
      if (payload.type !== "member") throw new Error("invalid token type");
      if (typeof payload.id !== "string") throw new Error("missing id");
      if (typeof payload.session_id !== "string")
        throw new Error("missing session_id");
      if (typeof payload.created_at !== "string")
        throw new Error("missing created_at");
      return {
        id: payload.id,
        session_id: payload.session_id,
        type: "member",
        tokenType: payload.tokenType === "refresh" ? "refresh" : undefined,
        created_at: payload.created_at,
        iat: typeof payload.iat === "number" ? payload.iat : undefined,
        exp: typeof payload.exp === "number" ? payload.exp : undefined,
        iss: typeof payload.iss === "string" ? payload.iss : undefined,
      };
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
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
      todo_app_member_id: true,
      expired_at: true,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
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
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const issuedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiredAt),
    },
  });
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
