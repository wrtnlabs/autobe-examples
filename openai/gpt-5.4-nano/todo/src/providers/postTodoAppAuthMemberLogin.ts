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

export async function postTodoAppAuthMemberLogin(props: {
  ip: string;
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      status: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      userProfile: {
        select: {
          display_name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (member === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.status !== "active") {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!verified) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  const accessExpiredIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      todo_app_member_id: member.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: typia.assert<string & tags.Format<"date-time">>(nowIso),
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpiredIso,
      ),
    },
  });
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: typia.assert<string & tags.Format<"date-time">>(nowIso),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: typia.assert<string & tags.Format<"date-time">>(nowIso),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: member.id,
    email: member.email,
    status: member.status,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(member.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(member.updated_at),
    ),
    deleted_at:
      member.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(member.deleted_at),
          ),
    profile: {
      display_name: member.userProfile ? member.userProfile.display_name : null,
      created_at: member.userProfile
        ? typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(member.userProfile.created_at),
          )
        : null,
      updated_at: member.userProfile
        ? typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(member.userProfile.updated_at),
          )
        : null,
      deleted_at:
        member.userProfile && member.userProfile.deleted_at !== null
          ? typia.assert<string & tags.Format<"date-time">>(
              toISOStringSafe(member.userProfile.deleted_at),
            )
          : null,
    },
    token: {
      access,
      refresh,
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpiredIso,
      ),
      refreshable_until: typia.assert<string & tags.Format<"date-time">>(
        refreshableUntilIso,
      ),
    },
  };
}
