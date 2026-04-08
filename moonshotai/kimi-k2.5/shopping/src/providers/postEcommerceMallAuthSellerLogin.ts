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
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowTimestamp = toISOStringSafe(new Date());
  const accessExpiresTimestamp = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresTimestamp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.ip,
      created_at: nowTimestamp,
      expired_at: accessExpiresTimestamp,
    },
  });
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: nowTimestamp,
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
      created_at: nowTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresTimestamp,
    refreshable_until: refreshExpiresTimestamp,
  };
  const transformedSeller =
    await EcommerceMallSellerTransformer.transform(seller);
  return {
    id: transformedSeller.id,
    email: transformedSeller.email,
    approvalStatus: transformedSeller.approvalStatus,
    createdAt: transformedSeller.createdAt,
    updatedAt: transformedSeller.updatedAt,
    deletedAt: transformedSeller.deletedAt,
    profile: transformedSeller.profile,
    token,
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerLogin(props: {
//   ip: string;
//   body: IEcommerceMallSeller.ILogin;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approvalStatus: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     profile: await EcommerceMallSellerTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------