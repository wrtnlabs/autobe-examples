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

export async function postMultiUserTodoAuthMemberLogin(props: {
  ip: string;
  body: IMultiUserTodoMember.ILogin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  const normalizedEmail = props.body.email.toLowerCase();
  const isoNow = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const memberAndToken = await MyGlobal.prisma.$transaction(async (tx) => {
    const member = await tx.multi_user_todo_members.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        password_hash: true,
        deleted_at: true,
      },
    });
    const validMember = member?.deleted_at === null;
    if (!member || !validMember) {
      throw new HttpException("Invalid credentials", 401);
    }
    const passwordOk = await PasswordUtil.verify(
      props.body.password,
      member.password_hash,
    );
    if (!passwordOk) {
      throw new HttpException("Invalid credentials", 401);
    }
    const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
    await tx.multi_user_todo_member_sessions.create({
      data: {
        id: sessionId,
        multi_user_todo_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: isoNow,
        expired_at: accessExpiresAt,
      },
    });
    const access = jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        created_at: isoNow,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refresh = jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: isoNow,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    const token: IAuthorizationToken = {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshableUntilAt,
    };
    return {
      memberId: member.id,
      token,
    };
  });
  return {
    id: memberAndToken.memberId,
    token: memberAndToken.token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
