import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  // Find member by username or email (no user enumeration)
  const member = await MyGlobal.prisma.discussion_board_member.findFirst({
    where: {
      OR: [{ username: body.usernameOrEmail }, { email: body.usernameOrEmail }],
    },
  });

  if (!member) throw new HttpException("Invalid credentials", 401);
  if (member.deleted_at)
    throw new HttpException("Account has been removed", 403);

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );
  if (!isValid) {
    // Best-effort audit log for failed login
    try {
      await MyGlobal.prisma.discussion_board_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          event_type: "auth.login.failed",
          event_timestamp: toISOStringSafe(new Date()),
          actor_type: "member",
          actor_id: member.id,
          ip: body.ip ?? "",
          metadata: null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });
    } catch {
      // swallow errors from audit logging
    }

    throw new HttpException("Invalid credentials", 401);
  }

  if (member.mfa_enabled) throw new HttpException("MFA required", 403);

  // Prepare timestamps (ISO strings)
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create session record
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        ip: body.ip ?? "",
        href: body.href ?? "",
        referrer: body.referrer ?? "",
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );

  // Best-effort audit log for successful login
  try {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "auth.login",
        event_timestamp: now,
        actor_type: "member",
        actor_id: member.id,
        ip: body.ip ?? "",
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch {
    // ignore audit logging errors
  }

  // Generate JWT tokens
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now,
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
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    email: member.email as string & tags.Format<"email">,
    display_name: member.display_name ?? undefined,
    role: member.role ?? undefined,
    mfa_enabled: member.mfa_enabled ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: member.updated_at
      ? toISOStringSafe(member.updated_at)
      : undefined,
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name ?? undefined,
      created_at: toISOStringSafe(member.created_at),
    },
  };
}
