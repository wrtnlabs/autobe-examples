import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerEmailVerificationTransformer } from "../transformers/EcommerceMallCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerEmailVerification.IRequest;
}): Promise<IEcommerceMallCustomerEmailVerification> {
  // Find the verification record by token
  const verification =
    await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.findUnique(
      {
        where: { token: props.body.token },
      },
    );
  // Token not found - 404
  if (verification === null) {
    throw new HttpException("Invalid verification token", 404);
  }
  // Check if token is expired - 400
  if (verification.expires_at < new Date()) {
    throw new HttpException(
      "Verification token has expired. Please request a new verification email.",
      400,
    );
  }
  // Check if already verified - 400
  if (verification.verified_at !== null) {
    throw new HttpException("Verification token has already been used", 400);
  }
  // Update verified_at using transaction for concurrency safety
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Re-fetch within transaction to prevent race condition
    const record =
      await tx.ecommerce_mall_customer_email_verifications.findUnique({
        where: { token: props.body.token },
        ...EcommerceMallCustomerEmailVerificationTransformer.select(),
      });
    if (record === null || record.verified_at !== null) {
      throw new HttpException("Verification token has already been used", 400);
    }
    return await tx.ecommerce_mall_customer_email_verifications.update({
      where: { id: record.id },
      data: { verified_at: new Date() },
      ...EcommerceMallCustomerEmailVerificationTransformer.select(),
    });
  });
  return await EcommerceMallCustomerEmailVerificationTransformer.transform(
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
// import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomerEmailVerifications(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerEmailVerification.IRequest;
// }): Promise<IEcommerceMallCustomerEmailVerification> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.findFirstOrThrow({
//     ...EcommerceMallCustomerEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCustomerEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------