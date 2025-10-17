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

export async function postAuthSellerJoin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  // Check for duplicate email
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: body.email, deleted_at: null },
    select: { id: true },
  });

  if (existingSeller !== null) {
    throw new HttpException("Conflict: Email already in use", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(body.password_hash);

  // Prepare timestamps and IDs without casting
  const now = toISOStringSafe(new Date());
  const newId = v4();

  // Create new seller record
  const created = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: hashedPassword,
      company_name: body.company_name ?? null,
      contact_name: body.contact_name ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Prepare JWT expiration times
  const accessTokenExpiry = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      status: created.status,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Return structured authorized seller info
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    company_name: created.company_name ?? undefined,
    contact_name: created.contact_name ?? undefined,
    phone_number: created.phone_number ?? undefined,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
    refresh_token: refreshToken,
  };
}
