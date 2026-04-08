import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerLogin(props: {
  ip: string;
  body: IEcommerceMallSeller.ILogin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Find seller by email with password_hash for verification
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...EcommerceMallSellerTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Verify seller exists and is not deleted
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Calculate expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // 5. Create new session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 7. Transform and return
  const sellerDto = await EcommerceMallSellerTransformer.transform(seller);
  return {
    id: sellerDto.id,
    email: sellerDto.email,
    approvalStatus: sellerDto.approvalStatus,
    createdAt: sellerDto.createdAt,
    updatedAt: sellerDto.updatedAt,
    deletedAt: sellerDto.deletedAt,
    profile: sellerDto.profile as unknown as IEcommerceMallSeller | null,
    token,
  } satisfies IEcommerceMallSeller.IAuthorized;
}
