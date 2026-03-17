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
  // 1. Find seller by email with password_hash
  const sellerRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!sellerRecord) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    sellerRecord.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check seller is not deleted
  if (sellerRecord.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 4. Calculate token expiration times
  const accessExpirationTimestamp: number = Date.now() + 60 * 60 * 1000;
  const refreshExpirationTimestamp: number =
    Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresISO: string = new Date(
    accessExpirationTimestamp,
  ).toISOString();
  const refreshExpiresISO: string = new Date(
    refreshExpirationTimestamp,
  ).toISOString();
  const nowISO: string = new Date().toISOString();
  // 5. Create session with JWT tokens
  const accessJwt: string = jwt.sign(
    {
      type: "seller" as const,
      id: sellerRecord.id,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: nowISO,
    } as const,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshJwt: string = jwt.sign(
    {
      type: "seller" as const,
      id: sellerRecord.id,
      session_id: v4() as string & tags.Format<"uuid">,
      token_type: "refresh" as const,
      created_at: nowISO,
    } as const,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const sessionId: string = v4() as string & tags.Format<"uuid">;
  const sessionRecord =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
      data: {
        id: sessionId,
        seller_id: sellerRecord.id,
        access_token: accessJwt,
        refresh_token: refreshJwt,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowISO,
        expired_at: accessExpiresISO,
      },
    });
  // 6. Return IAuthorized pattern
  return {
    id: sellerRecord.id,
    email: sellerRecord.email,
    created_at: toISOStringSafe(sellerRecord.created_at),
    updated_at: toISOStringSafe(sellerRecord.updated_at),
    deleted_at:
      sellerRecord.deleted_at !== null
        ? toISOStringSafe(sellerRecord.deleted_at)
        : null,
    token: {
      access: accessJwt,
      refresh: refreshJwt,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  } satisfies IEcommerceMallSeller.IAuthorized;
}
