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

export async function postEcommerceMallAuthSellerJoin(props: {
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  const existingSeller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const sellerId: string & tags.Format<"uuid"> = v4();
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      rejection_reason: null,
      is_suspended: false,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      is_suspended: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      token: v4(),
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejection_reason: seller.rejection_reason ?? undefined,
    is_suspended: seller.is_suspended,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token,
  };
}
