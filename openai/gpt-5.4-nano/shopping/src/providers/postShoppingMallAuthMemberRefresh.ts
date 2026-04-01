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
  try {
    const decoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (!decoded || typeof decoded !== "object") {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    const payload = decoded as Record<string, unknown>;
    const type = payload.type;
    const id = payload.id;
    const sessionId = payload.session_id;
    if (type !== "member") {
      throw new HttpException("Invalid token type", 401);
    }
    if (typeof id !== "string" || typeof sessionId !== "string") {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    const session =
      await MyGlobal.prisma.shopping_mall_member_sessions.findFirstOrThrow({
        where: {
          id: sessionId,
          shopping_mall_member_id: id,
        },
      });
    if (session.expired_at.getTime() <= Date.now()) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const member =
      await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
        where: { id },
      });
    if (member.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const nowIso = toISOStringSafe(new Date());
    const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessExpiredAt = toISOStringSafe(accessExpiresAt);
    const refreshableUntil = toISOStringSafe(refreshExpiresAt);
    const accessToken = jwt.sign(
      {
        type: "member",
        id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refreshToken = jwt.sign(
      {
        type: "member",
        id,
        session_id: sessionId,
        created_at: nowIso,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    await MyGlobal.prisma.shopping_mall_member_sessions.update({
      where: { id: sessionId },
      data: { expired_at: refreshExpiresAt },
    });
    return {
      id: member.id,
      email: member.email,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at:
        member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
    };
  } catch (e) {
    if (e instanceof HttpException) {
      throw e;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
