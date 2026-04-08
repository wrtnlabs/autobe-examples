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
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      approval_status: true,
      rejection_reason: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Not Found", 404);
  }
  const approvalStatus: "pending" | "approved" | "rejected" = typia.assert<
    "pending" | "approved" | "rejected"
  >(seller.approval_status);
  if (approvalStatus === "pending") {
    throw new HttpException("Account pending approval", 403);
  }
  if (approvalStatus === "rejected") {
    throw new HttpException(
      `Account rejected: ${seller.rejection_reason}`,
      403,
    );
  }
  if (seller.is_suspended) {
    throw new HttpException("Account suspended", 403);
  }
  const isValidPassword: boolean = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      access_token: "",
      refresh_token: "",
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      expired_at: accessExpiresAt,
    },
  });
  const tokenPayload: {
    type: "seller";
    id: string;
    session_id: string;
    created_at: string & tags.Format<"date-time">;
  } = {
    type: "seller",
    id: seller.id,
    session_id: sessionId,
    created_at: toISOStringSafe(new Date()),
  };
  const accessToken: string = jwt.sign(
    tokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken: string = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  const authorized: IEcommerceMallSeller.IAuthorized = {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    approval_status: approvalStatus,
    rejection_reason: seller.rejection_reason,
    is_suspended: seller.is_suspended,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshableUntil,
    },
  };
  return authorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerLogin(props: {
//   ip: string;
//   body: IEcommerceMallSeller.ILogin;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------