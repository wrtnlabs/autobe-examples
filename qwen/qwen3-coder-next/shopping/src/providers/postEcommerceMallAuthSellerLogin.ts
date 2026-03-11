import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallAuthSellerLogin(props: {
  ip: string;
  body: IEcommerceMallSeller.ILogin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_url: true,
      approval_status: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!seller) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  if (seller.deleted_at !== null)
    throw new HttpException("Account is deleted", 403);
  if (seller.is_suspended) throw new HttpException("Account is suspended", 403);
  if (seller.approval_status !== "approved")
    throw new HttpException("Account is not approved", 403);
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: seller.id,
      ip: props.ip,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      access_token: "",
      refresh_token: "",
      user_agent: "",
      referrer: "",
      is_revoked: false,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const response = {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? undefined,
    logo_url: seller.logo_url ?? undefined,
    approval_status: seller.approval_status,
    is_suspended: seller.is_suspended,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallSeller.IAuthorized;
  return response;
}
