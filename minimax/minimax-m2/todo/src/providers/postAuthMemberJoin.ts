import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: ITodoAppMember.ICreate;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Check for existing member with same email (prevent duplicates)
  const existingMember = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Create new member record
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const member = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      first_name: props.body.first_name ?? undefined,
      last_name: props.body.last_name ?? undefined,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 3. Create session record for the new member
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const sessionId = v4() as string & tags.Format<"uuid">;

  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      member_id: member.id,
      ip: props.member?.id ?? "unknown",
      href: "registration",
      referrer: "direct",
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // 4. Generate JWT access and refresh tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
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
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  // 5. Return authorized member with profile and tokens
  return {
    id: member.id,
    email: member.email,
    first_name: member.first_name ?? undefined,
    last_name: member.last_name ?? undefined,
    status: typia.assert<"active" | "suspended" | "deactivated">(
      props.body.status,
    ),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null
        ? toISOStringSafe(member.deleted_at)
        : undefined,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
