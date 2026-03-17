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
  // 1. Verify refresh token
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as any).type !== "string" ||
    typeof (decoded as any).id !== "string" ||
    typeof (decoded as any).session_id !== "string" ||
    typeof (decoded as any).created_at !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const { type, id, session_id, created_at } = decoded as {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  // 2. Validate token type
  if (type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: session_id,
      todo_app_member_id: id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 4. Validate member account exists and is not deleted
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (same session_id)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const tokenCreatedAt = toISOStringSafe(now);
  const accessToken = jwt.sign(
    {
      type: "member",
      id,
      session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id,
      session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 6. Return the authorized response
  const result = {
    access_token: accessToken,
    refresh_token: refreshToken,
    access_expired_at: toISOStringSafe(accessExpires),
    refresh_expired_at: toISOStringSafe(refreshExpires),
  };
  return typia.assert<ITodoAppMember.IAuthorized>(result);
}
