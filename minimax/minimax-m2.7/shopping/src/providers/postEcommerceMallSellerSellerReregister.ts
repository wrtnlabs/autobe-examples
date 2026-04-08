import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAtReregisterResponseTransformer } from "../transformers/EcommerceMallSellerAtReregisterResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellerReregister(props: {
  seller: SellerPayload;
  body: IEcommerceMallSeller.ICreate;
}): Promise<IEcommerceMallSeller.IReregisterResponse> {
  // 1. Find seller by email from body
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      approval_status: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // 2. Validate password using PasswordUtil comparison
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check approval_status - only rejected sellers can reregister
  if (seller.approval_status === "pending") {
    throw new HttpException("Registration already pending", 400);
  }
  if (seller.approval_status === "approved") {
    throw new HttpException("Registration already approved", 400);
  }
  // Only 'rejected' status can proceed with reregistration
  const now = new Date();
  // 4. Update seller: reset approval_status to 'pending', clear rejection fields
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: seller.id },
    data: {
      approval_status: "pending",
      rejected_at: undefined,
      rejection_reason: undefined,
      updated_at: now,
    },
  });
  // 5. Create new seller_approval record with 'pending' status
  const approvalId = v4();
  await MyGlobal.prisma.ecommerce_mall_seller_approvals.create({
    data: {
      id: approvalId,
      ecommerce_mall_seller_id: seller.id,
      reviewed_by_admin_id: undefined,
      status: "pending",
      rejection_reason: undefined,
      created_at: now,
      updated_at: now,
    },
  });
  // 6. Generate JWT tokens
  const sessionId = v4();
  const accessTokenSecret = MyGlobal.env.JWT_SECRET_KEY;
  const tokenExpirySeconds = 3600;
  const refreshExpirySeconds = 604800;
  const accessToken = jwt.sign(
    {
      id: seller.id,
      session_id: sessionId,
      type: "seller" as const,
    },
    accessTokenSecret,
    { expiresIn: tokenExpirySeconds },
  );
  const refreshToken = jwt.sign(
    {
      id: seller.id,
      session_id: sessionId,
      type: "seller" as const,
    },
    accessTokenSecret,
    { expiresIn: refreshExpirySeconds },
  );
  const expiredAtTimestamp = new Date(Date.now() + refreshExpirySeconds * 1000);
  const expiredAtString = expiredAtTimestamp.toISOString();
  // 7. Create session record
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: now,
      expired_at: expiredAtTimestamp,
    },
  });
  // 8. Fetch updated seller using transformer select
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: seller.id },
      ...EcommerceMallSellerAtReregisterResponseTransformer.select(),
    });
  // 9. Return response using transformer
  return await EcommerceMallSellerAtReregisterResponseTransformer.transform(
    updatedSeller,
    {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiredAt: expiredAtString as string & tags.Format<"date-time">,
    },
  );
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellerReregister(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSeller.ICreate;
// }): Promise<IEcommerceMallSeller.IReregisterResponse> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.create({
//     data: await EcommerceMallSellerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerAtReregisterResponseTransformer.select(),
//   });
//   return await EcommerceMallSellerAtReregisterResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------