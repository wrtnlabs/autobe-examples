import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthMemberRefresh(props: {
  body: IShoppingMallMember.IRefresh;
}): Promise<IShoppingMallMember.IAuthorized> {
  const secret = MyGlobal.env.JWT_SECRET_KEY;
  const issuer = "autobe";
  const decoded = (() => {
    try {
      return jwt.verify(props.body.refreshToken, secret, { issuer }) as unknown;
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  if (
    !decoded ||
    typeof decoded !== "object" ||
    (decoded as any).session_id === undefined ||
    (decoded as any).id === undefined ||
    (decoded as any).type === undefined
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const payload = decoded as {
    id: string;
    session_id: string;
    type: string;
  };
  if (payload.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  const session = await MyGlobal.prisma.shopping_mall_member_sessions.findFirst(
    {
      where: {
        id: payload.session_id,
        shopping_mall_member_id: payload.id,
      },
      select: {
        id: true,
        expired_at: true,
        shopping_mall_member_id: true,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  const sessionExpiredIso = toISOStringSafe(session.expired_at);
  if (sessionExpiredIso <= nowIso) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const createdAtIso = toISOStringSafe(new Date());
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiredAt = toISOStringSafe(new Date(accessExpiresMs));
  const refreshableUntil = toISOStringSafe(new Date(refreshExpiresMs));
  const access = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      created_at: createdAtIso,
    },
    secret,
    { expiresIn: "1h", issuer },
  );
  const refresh = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    secret,
    { expiresIn: "7d", issuer },
  );
  await MyGlobal.prisma.shopping_mall_member_sessions.update({
    where: { id: payload.session_id },
    data: { expired_at: new Date(refreshExpiresMs) },
  });
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
