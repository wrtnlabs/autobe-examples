import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerEmailVerificationTransformer } from "../transformers/EcommerceMallSellerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerEmailVerifications(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerEmailVerification.IRequest;
}): Promise<IEcommerceMallSellerEmailVerification> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findFirst({
      ...EcommerceMallSellerEmailVerificationTransformer.select(),
      where: { token: props.body.token },
    });
  if (!record) {
    throw new HttpException("Verification token not found", 404);
  }
  const now = new Date();
  const expiresAt = record.expires_at;
  if (now >= expiresAt) {
    throw new HttpException("Verification token has expired", 400);
  }
  if (record.verified_at !== null) {
    throw new HttpException("Verification token has already been used", 400);
  }
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.update({
      where: { id: record.id },
      data: { verified_at: now },
      ...EcommerceMallSellerEmailVerificationTransformer.select(),
    });
  return await EcommerceMallSellerEmailVerificationTransformer.transform(
    updated,
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
// import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerEmailVerifications(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerEmailVerification.IRequest;
// }): Promise<IEcommerceMallSellerEmailVerification> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findFirstOrThrow({
//     ...EcommerceMallSellerEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------