import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
    where: { email: props.body.email },
    ...EcommerceMallSellerTransformer.select(),
  });
  // 2. Check seller exists and not deleted
  if (!seller || seller.deleted_at !== null) {
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
  // 4. Check approval status - only approved sellers can login
  if (seller.approval_status !== "approved") {
    const message =
      seller.approval_status === "rejected"
        ? `Account rejected: ${seller.rejection_reason ?? "No reason provided"}`
        : "Account pending approval";
    throw new HttpException(message, 403);
  }
  // 5. Create new session with ISO datetime strings
  const accessExpiresStr = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresStr = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.ip,
      href: props.ip,
      referrer: "",
      created_at: new Date(),
      expired_at: new Date(accessExpiresStr),
    },
  });
  // 6. Generate JWT tokens
  const currentTime = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: currentTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: currentTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  // 7. Return authorized response
  const transformed = await EcommerceMallSellerTransformer.transform(seller);
  return {
    ...transformed,
    approvalStatus: transformed.approvalStatus as
      | "pending"
      | "approved"
      | "rejected",
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
//     rejectionReason: ...,
//     rejectedAt: ...,
//     profile: await EcommerceMallSellerProfileTransformer.transform(...),
//     productsCount: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------