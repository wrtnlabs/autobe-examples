import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAppAuthMemberJoin(props: {
  ip: string;
  body: IMultiUserTodoAppMember.IJoin;
}): Promise<IMultiUserTodoAppMember.IAuthorized> {
  const { email, password, href, referrer, ip } = props.body;
  const existingMember =
    await MyGlobal.prisma.multi_user_todo_app_members.findFirst({
      where: { email },
    });
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(password);
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const member = await MyGlobal.prisma.multi_user_todo_app_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const session =
    await MyGlobal.prisma.multi_user_todo_app_member_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        multi_user_todo_app_member_id: member.id,
        access_token: "",
        refresh_token: "",
        ip: props.ip,
        href,
        referrer,
        created_at: now,
        expired_at: accessExpiresAt,
      },
    });
  const accessToken = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  session.access_token = accessToken;
  session.refresh_token = refreshToken;
  await MyGlobal.prisma.multi_user_todo_app_member_sessions.update({
    where: { id: session.id },
    data: { access_token: accessToken, refresh_token: refreshToken },
  });
  return {
    id: member.id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    displayName: "",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  } satisfies IMultiUserTodoAppMember.IAuthorized;
}
