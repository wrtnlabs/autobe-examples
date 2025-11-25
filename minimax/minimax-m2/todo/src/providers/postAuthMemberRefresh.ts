import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "member";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate token type matches expected actor type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      member_id: decoded.id,
    },
    include: {
      // No relations to include - session is standalone
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Verify member exists and is active
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!member) {
    throw new HttpException("Account has been deleted or deactivated", 403);
  }

  // Step 5: Generate new tokens with SAME session_id (critical for session continuity)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  );

  const newTokens: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // CRITICAL: Reuse existing session
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // CRITICAL: Reuse existing session
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Step 6: Update session expiration time
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpires),
    },
  });

  // Step 7: Return complete member profile with new tokens
  return {
    id: member.id,
    email: member.email,
    first_name: member.first_name ?? undefined,
    last_name: member.last_name ?? undefined,
    status: member.status as "active" | "suspended" | "deactivated",
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    token: newTokens,
  };
}
