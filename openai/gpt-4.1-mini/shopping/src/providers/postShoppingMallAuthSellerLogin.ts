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

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_uri: true,
      approval_status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpiredAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiredAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const sessionIdTyped = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionIdTyped,
      seller: { connect: { id: seller.id } },
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  return {
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    shopDescription: seller.shop_description ?? null,
    logoUri: seller.logo_uri ?? null,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason ?? null,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at ? seller.deleted_at.toISOString() : null,
    token,
  };
}
