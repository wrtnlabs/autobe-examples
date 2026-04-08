import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  interface IRefreshTokenPayload {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
  }
  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decoded === "string") {
    throw new HttpException("Invalid token payload", 401);
  }
  if (!decoded.id || !decoded.session_id || !decoded.type) {
    throw new HttpException("Invalid token payload", 401);
  }
  const payload = typia.assert<IRefreshTokenPayload>(decoded);
  if (payload.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_admin_id: payload.id,
      refresh_token: props.body.refresh_token,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date().toISOString();
  const sessionExpiredAt = session.expired_at.toISOString();
  if (sessionExpiredAt < now) {
    throw new HttpException("Session has expired", 401);
  }
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: payload.id },
  });
  if (admin.banned_at !== null) {
    throw new HttpException("Administrator account is banned", 403);
  }
  if (admin.deleted_at !== null) {
    throw new HttpException("Administrator account has been deleted", 403);
  }
  const accessExpiresAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const access = jwt.sign(
    {
      type: "admin",
      id: payload.id,
      session_id: payload.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: payload.session_id },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: new Date(refreshExpiresAt),
    },
  });
  const updatedAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: payload.id },
      ...ShoppingMallAdminTransformer.select(),
    });
  const transformed =
    await ShoppingMallAdminTransformer.transform(updatedAdmin);
  return {
    id: transformed.id,
    email: transformed.email,
    grade: transformed.grade,
    bannedAt: transformed.bannedAt,
    createdAt: transformed.createdAt,
    updatedAt: transformed.updatedAt,
    deletedAt: transformed.deletedAt,
    member: transformed.member,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
