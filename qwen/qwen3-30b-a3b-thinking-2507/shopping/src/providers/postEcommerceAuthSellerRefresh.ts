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

export async function postEcommerceAuthSellerRefresh(props: {
  body: IEcommerceSeller.IRefresh;
}): Promise<IEcommerceSeller.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "seller";
  };
  try {
    // Fix: Cast props.body to type that includes refreshToken property
    const refreshToken = (
      props.body as {
        refreshToken: string;
      }
    ).refreshToken;
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    if (decoded.type !== "seller") {
      throw new HttpException("Invalid token type", 403);
    }
    const session = await MyGlobal.prisma.ecommerce_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        seller: { id: decoded.id },
      },
    });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
    if (seller.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    await MyGlobal.prisma.ecommerce_seller_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    return {
      id: seller.id,
      email: seller.email,
      name: seller.name,
      description: seller.description,
      status: typia.assert<"pending" | "approved" | "rejected">(seller.status),
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
      token,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
