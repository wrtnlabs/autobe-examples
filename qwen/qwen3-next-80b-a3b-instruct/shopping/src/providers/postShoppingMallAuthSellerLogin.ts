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
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_active: true,
      status: true,
      suspended_at: true,
      deleted_at: true,
      created_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.suspended_at !== null) {
    throw new HttpException("Your seller account is suspended", 403);
  }
  if (seller.status !== "approved") {
    if (seller.status === "pending") {
      throw new HttpException("Your seller account is pending approval", 403);
    }
    if (seller.status === "rejected") {
      throw new HttpException("Your seller account has been rejected", 403);
    }
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: props.ip ?? "unknown",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller" as const,
        id: seller.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller" as const,
        id: seller.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh" as const,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: seller.id as string & tags.Format<"uuid">,
    token,
    expired_at: toISOStringSafe(accessExpires),
  } satisfies IShoppingMallSeller.IAuthorized;
}
