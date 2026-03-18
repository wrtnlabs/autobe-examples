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

export async function postMultiUserTodoAuthMemberJoin(props: {
  ip: string;
  body: IMultiUserTodoMember.IJoin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  const email = props.body.email.trim().toLowerCase();
  if (email.length === 0) {
    throw new HttpException("Invalid email", 400);
  }
  const existing = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email },
    select: { id: true, deleted_at: true },
  });
  if (existing != null) {
    throw new HttpException("Email already registered", 409);
  }
  const password_hash = await PasswordUtil.hash(
    props.body.password as unknown as string,
  );
  const accessExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const refreshableUntilIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const nowIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now())),
  );
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const memberId = typia.assert<string & tags.Format<"uuid">>(v4());
    const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
    const member = await tx.multi_user_todo_members.create({
      data: {
        id: memberId,
        email,
        password_hash,
        deleted_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    });
    const session = await tx.multi_user_todo_member_sessions.create({
      data: {
        id: sessionId,
        multi_user_todo_member_id: member.id,
        ip: props.ip,
        href: props.ip,
        referrer: props.ip,
        expired_at: accessExpiresIso,
        created_at: nowIso,
      },
    });
    return { member, session };
  });
  const access = jwt.sign(
    {
      type: "member",
      id: created.member.id,
      session_id: created.session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: created.member.id,
      session_id: created.session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: created.member.id,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshableUntilIso,
    },
  } satisfies IMultiUserTodoMember.IAuthorized;
}
