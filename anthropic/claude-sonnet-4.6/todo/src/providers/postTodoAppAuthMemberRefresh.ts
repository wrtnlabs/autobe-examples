import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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
  // 1. Verify and decode the refresh token
  let decodedRaw: unknown;
  try {
    decodedRaw = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Narrow type safely without `as`
  if (
    typeof decodedRaw !== "object" ||
    decodedRaw === null ||
    typeof (decodedRaw as Record<string, unknown>)["id"] !== "string" ||
    typeof (decodedRaw as Record<string, unknown>)["session_id"] !== "string" ||
    typeof (decodedRaw as Record<string, unknown>)["type"] !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const decoded = decodedRaw as {
    id: string;
    session_id: string;
    type: string;
  };
  // 3. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 4. Validate session exists and is not expired
  const now = new Date();
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_member_id: decoded.id,
      expired_at: { gt: now },
    },
    select: { id: true },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate member exists and is active
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          todo_app_member_id: true,
          display_name: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (!member.profile) {
    throw new HttpException("Member profile not found", 500);
  }
  // 6. Generate new tokens (same session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expired_at (token rotation)
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Build and return ITodoAppMember.IAuthorized
  return {
    id: member.id,
    email: member.email,
    profile: {
      id: member.profile.id,
      memberId: member.profile.todo_app_member_id,
      displayName: member.profile.display_name,
      createdAt: toISOStringSafe(member.profile.created_at),
      updatedAt: toISOStringSafe(member.profile.updated_at),
    } satisfies ITodoAppUserProfile,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppMember.IAuthorized;
}
