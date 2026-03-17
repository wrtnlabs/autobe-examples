import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const duplicated = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (duplicated !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const sellerId = v4();
  const sessionId = v4();
  const now = Date.now();
  const createdAtText = toISOStringSafe(new globalThis.Date(now));
  const expiredAtText = toISOStringSafe(
    new globalThis.Date(now + 60 * 60 * 1000),
  );
  const refreshableUntilText = toISOStringSafe(
    new globalThis.Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      approval_status: "pending",
      rejection_reason: null,
      suspended: false,
      banned: false,
      created_at: new globalThis.Date(createdAtText),
      updated_at: new globalThis.Date(createdAtText),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      suspended: true,
      banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  try {
    const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
      data: {
        id: sessionId,
        shopping_mall_seller_id: seller.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new globalThis.Date(createdAtText),
        expired_at: new globalThis.Date(expiredAtText),
      },
      select: {
        id: true,
      },
    });
    const token: IAuthorizationToken = {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          created_at: createdAtText,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: createdAtText,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: expiredAtText,
      refreshable_until: refreshableUntilText,
    };
    return {
      id: seller.id,
      email: seller.email,
      approval_status: seller.approval_status,
      rejection_reason: seller.rejection_reason,
      suspended: seller.suspended,
      banned: seller.banned,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at:
        seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
      token,
    };
  } catch (error) {
    await MyGlobal.prisma.shopping_mall_sellers.delete({
      where: {
        id: seller.id,
      },
    });
    throw error;
  }
}
