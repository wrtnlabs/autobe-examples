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

export async function postEcommerceMallAuthSellerLogin(props: {
  ip: string;
  body: IEcommerceMallSeller.ILogin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Find seller by email with password_hash for verification
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      approval_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if account is suspended or deleted
  if (seller.approval_status === "suspended") {
    throw new HttpException("Account is suspended", 403);
  }
  // Save deleted_at before the check to avoid TypeScript narrowing it to never
  const deletedAtValue = seller.deleted_at;
  if (deletedAtValue !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Fetch seller profile for shop info - using the correct table name
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: { seller_id: seller.id },
      orderBy: { created_at: "desc" },
      select: {
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
      },
    });
  // Calculate expiration timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpiresISO: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpiresISO: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const createdAtISO: string & tags.Format<"date-time"> = toISOStringSafe(now);
  // Create new session
  const sessionData: Prisma.ecommerce_mall_seller_sessionsCreateInput = {
    id: sessionId,
    seller: {
      connect: { id: seller.id },
    },
    ip: props.ip,
    href: "",
    referrer: "",
    created_at: createdAtISO,
    expired_at: accessExpiresISO,
  };
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: sessionData,
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: sessionId,
        created_at: createdAtISO,
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
        created_at: createdAtISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  // Return authorized seller response
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    approvalStatus: seller.approval_status,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: deletedAtValue !== null ? toISOStringSafe(deletedAtValue) : null,
    shopName: profile?.shop_name ?? null,
    shopDescription: profile?.shop_description ?? null,
    logoImageUrl: profile?.logo_image_url ?? null,
    token,
  } satisfies IEcommerceMallSeller.IAuthorized;
}
