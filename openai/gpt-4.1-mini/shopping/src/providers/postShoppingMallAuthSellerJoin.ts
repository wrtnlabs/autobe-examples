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
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Cast email and password from props.body as any and assert string to fix compilation errors
  const email = typia.assert<string>((props.body as any).email);
  const password = typia.assert<string>((props.body as any).password);
  // Check for existing seller with same email
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: email },
  });
  if (existingSeller) throw new HttpException("Email already registered", 409);
  // Prepare UUIDs
  const sellerId: string & tags.Format<"uuid"> = v4();
  const emailVerificationId: string & tags.Format<"uuid"> = v4();
  const emailVerificationToken: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Prepare timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const emailVerificationExpiry: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 24 * 3600 * 1000));
  const sessionExpiry: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const sessionRefreshExpiry: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  // Hash password
  const passwordHash: string = await PasswordUtil.hash(password);
  // Create seller record with 'pending' approval_status
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: email,
      password_hash: passwordHash,
      shop_name: "",
      shop_description: null,
      logo_uri: null,
      approval_status: "pending",
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create email verification record
  await MyGlobal.prisma.shopping_mall_seller_email_verifications.create({
    data: {
      id: emailVerificationId,
      seller_id: sellerId,
      token: emailVerificationToken,
      expired_at: emailVerificationExpiry,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create seller session with ip, href, referrer from props.body or empty string if not present
  const ip: string = (props.body as any).ip ?? "";
  const href: string = (props.body as any).href ?? "";
  const referrer: string = (props.body as any).referrer ?? "";
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: sellerId,
      ip,
      href,
      referrer,
      created_at: now,
      expired_at: sessionExpiry,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Return authorized seller data with token
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: sessionExpiry,
      refreshable_until: sessionRefreshExpiry,
    },
  };
}
