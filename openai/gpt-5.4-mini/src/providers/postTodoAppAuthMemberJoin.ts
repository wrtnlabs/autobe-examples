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

export async function postTodoAppAuthMemberJoin(props: {
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const passwordHash = await PasswordUtil.hash(
    props.body.password as unknown as string,
  );
  const created = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const issuedAt = now.toISOString();
  const expiredAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const refreshableUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    id: created.id,
    email: created.email,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    deleted_at: created.deleted_at?.toISOString() ?? null,
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: created.id,
          session_id: created.id,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: created.id,
          session_id: created.id,
          tokenType: "refresh",
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  } satisfies ITodoAppMember.IAuthorized;
}
