import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthSellerLogin(props: {
  ip: string;
  body: IMallPlatformSeller.ILogin;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.mall_platform_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.status !== "approved") {
    throw new HttpException("Invalid credentials", 401);
  }
  if (
    (await PasswordUtil.verify(props.body.password, seller.password_hash)) ===
    false
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  const issuedAtText = new Date().toISOString();
  const issuedAtTime = new Date(issuedAtText).getTime();
  const accessExpiresAtText = new Date(
    issuedAtTime + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAtText = new Date(
    issuedAtTime + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.mall_platform_seller_sessions.create({
    data: {
      id: sessionId,
      mall_platform_seller_id: seller.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: issuedAtText,
      expired_at: refreshExpiresAtText,
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    status: seller.status,
    rejectionReason: seller.rejection_reason ?? null,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt:
      seller.deleted_at === null ? null : seller.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: sessionId,
          created_at: issuedAtText,
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
          created_at: issuedAtText,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiresAtText,
      refreshable_until: refreshExpiresAtText,
    },
  };
}
