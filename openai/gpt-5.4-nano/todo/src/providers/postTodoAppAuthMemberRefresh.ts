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
  const verified = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  const payload = typia.assert<{
    type: string;
    id: string;
    session_id: string;
    created_at?: string;
  }>(verified);
  if (payload.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const memberId = typia.assert<string & tags.Format<"uuid">>(payload.id);
  const sessionId = typia.assert<string & tags.Format<"uuid">>(
    payload.session_id,
  );
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.todo_app_member_sessions.findFirstOrThrow({
      where: { id: sessionId, todo_app_member_id: member.id },
      select: { id: true, expired_at: true },
    });
  const nowMs = Date.now();
  if (session.expired_at.getTime() <= nowMs) {
    throw new HttpException("Unauthorized", 401);
  }
  const createdAtIso = toISOStringSafe(new Date(nowMs));
  const accessTtlMs = 1000 * 60 * 60;
  const refreshTtlMs = 1000 * 60 * 60 * 24 * 7;
  const newAccessExpiredAtIso = toISOStringSafe(new Date(nowMs + accessTtlMs));
  const newRefreshableUntilIso = toISOStringSafe(
    new Date(nowMs + refreshTtlMs),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "7d" },
  );
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(nowMs + refreshTtlMs) },
  });
  return {
    id: member.id,
    email: member.email,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    profile: {},
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: newAccessExpiredAtIso,
      refreshable_until: newRefreshableUntilIso,
    },
  };
}
