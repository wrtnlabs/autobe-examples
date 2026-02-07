import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function postEcommerceAuthSellerJoin(props: {
  body: IEcommerceSeller.IJoin;
}): Promise<IEcommerceSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const id = v4();
  const seller = await MyGlobal.prisma.ecommerce_sellers.create({
    data: {
      id,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      approval_status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_seller_email_verifications.create({
    data: {
      id: v4(),
      ecommerce_seller_id: seller.id,
      token: v4(),
      is_verified: false,
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: {
      id: v4(),
      ecommerce_seller_id: seller.id,
      expired_at: toISOStringSafe(accessExpires),
      created_at: toISOStringSafe(new Date()),
      ip: null,
      href: "",
      referrer: "",
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
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    created_at: seller.created_at,
    updated_at: seller.updated_at,
    deleted_at: seller.deleted_at,
    token,
  } satisfies IEcommerceSeller.IAuthorized;
}
