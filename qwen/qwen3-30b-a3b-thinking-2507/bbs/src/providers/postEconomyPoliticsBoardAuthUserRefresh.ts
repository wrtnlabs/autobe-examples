import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAuthUserRefresh(props: {
  body: IEconomyPoliticsBoardUser.IRefresh;
}): Promise<IEconomyPoliticsBoardUser.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe", algorithms: ["HS256"] },
    ) as typeof decoded;
    if (decoded.type !== "user") {
      throw new HttpException("Invalid token type", 401);
    }
    const session =
      await MyGlobal.prisma.economy_politics_board_user_sessions.findFirst({
        where: {
          id: decoded.session_id,
          user_id: decoded.id,
        },
      });
    if (!session) {
      throw new HttpException("Session does not exist or is revoked", 401);
    }
    const user =
      await MyGlobal.prisma.economy_politics_board_users.findUniqueOrThrow({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (user.deleted_at) {
      throw new HttpException("User account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: "user",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe", algorithm: "HS256" },
      ),
      refresh: jwt.sign(
        {
          type: "user",
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe", algorithm: "HS256" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    await MyGlobal.prisma.economy_politics_board_user_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: toISOStringSafe(refreshExpires) },
    });
    return {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
      token: {
        access: token.access,
        refresh: token.refresh,
        expired_at: token.expired_at,
        refreshable_until: token.refreshable_until,
      },
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  } finally {
  }
}
