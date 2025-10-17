import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerLogin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      company_name: true,
      contact_name: true,
      phone_number: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }

  const isValid = await PasswordUtil.verify(
    body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  const accessToken = jwt.sign(
    {
      id: seller.id,
      email: seller.email,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: seller.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: seller.id,
    email: seller.email,
    password_hash: seller.password_hash,
    company_name: seller.company_name ?? undefined,
    contact_name: seller.contact_name ?? undefined,
    phone_number: seller.phone_number ?? undefined,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
    refresh_token: refreshToken,
  };
}
