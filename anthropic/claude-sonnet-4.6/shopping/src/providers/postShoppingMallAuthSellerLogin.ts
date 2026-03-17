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
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerLogin(props: {
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Find seller by email (active accounts only)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
      deleted_at: null,
    },
    select: {
      ...ShoppingMallSellerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check banned state — banned sellers cannot log in
  if (seller.is_banned) {
    throw new HttpException("Your account has been banned", 403);
  }
  // 4. Compute expiry timestamps
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  // 5. Generate a new session ID and JWT tokens
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Persist the new session record
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: null,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 7. Transform seller record to DTO using existing transformer
  const sellerDto = await ShoppingMallSellerTransformer.transform(seller);
  // 8. Return IShoppingMallSeller.IAuthorized
  return {
    id: sellerDto.id,
    email: sellerDto.email,
    shopName: sellerDto.shopName,
    isBanned: sellerDto.isBanned,
    isSuspended: sellerDto.isSuspended,
    createdAt: sellerDto.createdAt,
    updatedAt: sellerDto.updatedAt,
    deletedAt: sellerDto.deletedAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
    seller: sellerDto,
  };
}
