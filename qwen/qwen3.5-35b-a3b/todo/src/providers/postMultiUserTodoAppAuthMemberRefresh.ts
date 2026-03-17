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

export async function postMultiUserTodoAppAuthMemberRefresh(props: {
  body: IMultiUserTodoAppMember.IRefresh;
}): Promise<IMultiUserTodoAppMember.IAuthorized> {
  // 1. Verify refresh token and decode
  type IDecodedMember = {
    type: "member";
    id: string;
    member_id: string;
    tokenType?: "refresh";
    created_at: string;
  };
  let decoded: IDecodedMember;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as IDecodedMember;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and not expired
  const session =
    await MyGlobal.prisma.multi_user_todo_app_member_sessions.findFirst({
      where: {
        id: decoded.id,
        multi_user_todo_app_member_id: decoded.member_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member exists and not deleted
  const member =
    await MyGlobal.prisma.multi_user_todo_app_members.findUniqueOrThrow({
      where: { id: decoded.member_id },
      select: { id: true, created_at: true, updated_at: true, email: true },
    });
  // 5. Generate new tokens (1 hour access, 7 days refresh)
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken: string = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: decoded.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: decoded.id,
      tokenType: "refresh" as const,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.multi_user_todo_app_member_sessions.update({
    where: { id: decoded.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: new Date(refreshExpiresIso),
    },
  });
  // 7. Build response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso as string & tags.Format<"date-time">,
    refreshable_until: refreshExpiresIso as string & tags.Format<"date-time">,
  };
  const response: IMultiUserTodoAppMember.IAuthorized = {
    id: member.id as string & tags.Format<"uuid">,
    createdAt: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    displayName: member.email,
    token: token,
  };
  return response;
}
