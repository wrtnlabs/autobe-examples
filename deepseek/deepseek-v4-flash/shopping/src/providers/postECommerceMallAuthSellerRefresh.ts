import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallSellerProfileTransformer } from "../transformers/ECommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postECommerceMallAuthSellerRefresh(props: {
  body: IECommerceMallSeller.IRefresh;
}): Promise<IECommerceMallSeller.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof decoded === "string") {
    throw new HttpException("Invalid token", 401);
  }
  if (
    decoded.type !== "seller" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.id !== "string"
  ) {
    throw new HttpException("Invalid token", 401);
  }
  const oldSession =
    await MyGlobal.prisma.e_commerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        e_commerce_mall_seller_id: decoded.id,
      },
    });
  if (!oldSession) {
    throw new HttpException("Session not found", 401);
  }
  if (oldSession.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  const seller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: ECommerceMallSellerProfileTransformer.select(),
      },
    });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const newSessionId = v4();
  const now = new Date();
  const refreshExpiresDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresDate = new Date(now.getTime() + 60 * 60 * 1000);
  await MyGlobal.prisma.e_commerce_mall_seller_sessions.create({
    data: {
      id: newSessionId,
      e_commerce_mall_seller_id: decoded.id,
      ip: oldSession.ip,
      href: oldSession.href,
      referrer: oldSession.referrer,
      created_at: now,
      expired_at: refreshExpiresDate,
    },
  });
  await MyGlobal.prisma.e_commerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: now },
  });
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: newSessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const profile = seller.profile
    ? await ECommerceMallSellerProfileTransformer.transform(seller.profile)
    : null;
  return {
    id: decoded.id,
    email: seller.email,
    approval_status: seller.approval_status,
    profile,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  };
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
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthSellerRefresh(props: {
//   body: IECommerceMallSeller.IRefresh;
// }): Promise<IECommerceMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approval_status: ...,
//     profile: await ECommerceMallSellerProfileTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------