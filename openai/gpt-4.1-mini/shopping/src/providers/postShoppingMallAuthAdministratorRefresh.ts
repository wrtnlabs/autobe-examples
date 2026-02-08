import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorRefresh(props: {
  body: IShoppingMallAdministrator.IRefresh;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "administrator";
  };
  try {
    const refreshToken: string =
      (props.body as any).refreshToken ?? (props.body as any).token ?? "";
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpireTime = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpireTime);
  const refreshExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpireTime);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
