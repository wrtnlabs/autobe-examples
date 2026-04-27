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
import { ECommerceMallSellerTransformer } from "../transformers/ECommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthSellerLogin(props: {
  ip: string;
  body: IECommerceMallSeller.ILogin;
}): Promise<IECommerceMallSeller.IAuthorized> {
  // 1. Find seller by email with password_hash for credential verification
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Compute timestamps using epoch math — values converted to ISO strings inline
  const nowEpoch = Date.now();
  const accessExpiresEpoch = nowEpoch + 60 * 60 * 1000;
  const refreshExpiresEpoch = nowEpoch + 7 * 24 * 60 * 60 * 1000;
  // 4. Create new session (DateTime fields accept ISO strings)
  const session = await MyGlobal.prisma.e_commerce_mall_seller_sessions.create({
    data: {
      id: v4(),
      e_commerce_mall_seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(nowEpoch).toISOString(),
      expired_at: new Date(accessExpiresEpoch).toISOString(),
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: new Date(nowEpoch).toISOString(),
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
        created_at: new Date(nowEpoch).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: new Date(accessExpiresEpoch).toISOString(),
    refreshable_until: new Date(refreshExpiresEpoch).toISOString(),
  };
  // 6. Query full seller data using transformer select (no password_hash)
  const sellerData =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: seller.id },
      ...ECommerceMallSellerTransformer.select(),
    });
  // 7. Transform to response DTO and append token
  const sellerDto = await ECommerceMallSellerTransformer.transform(sellerData);
  return {
    ...sellerDto,
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
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthSellerLogin(props: {
//   ip: string;
//   body: IECommerceMallSeller.ILogin;
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