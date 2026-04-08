import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellersSellerIdPasswordResets(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerPasswordReset.IReset;
}): Promise<IEcommerceMallSeller> {
  // 1. Verify seller exists and is not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // 2. Find reset token matching token and sellerId
  const resetRecord =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findFirst({
      where: {
        token: props.body.token,
        ecommerce_mall_seller_id: props.sellerId,
      },
      select: {
        id: true,
        expires_at: true,
        used_at: true,
      },
    });
  if (resetRecord === null) {
    throw new HttpException("Invalid reset token", 404);
  }
  // 3. Validate token has not been used
  if (resetRecord.used_at !== null) {
    throw new HttpException("Reset token has already been used", 400);
  }
  // 4. Validate token has not expired - compare timestamp values
  const nowTimestamp = new Date().getTime();
  const expiresTimestamp = new Date(resetRecord.expires_at).getTime();
  if (expiresTimestamp <= nowTimestamp) {
    throw new HttpException("Reset token has expired", 400);
  }
  // 5. Hash new password using PasswordUtil
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  // 6. Execute password update and token usage in transaction for atomicity
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_password_resets.update({
      where: { id: resetRecord.id },
      data: {
        used_at: new Date(),
      },
    }),
  ]);
  // 7. Fetch updated seller with transformer
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updatedSeller);
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
// import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminSellersSellerIdPasswordResets(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerPasswordReset.IReset;
// }): Promise<IEcommerceMallSeller> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------