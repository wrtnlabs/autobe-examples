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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerSellerPassword(props: {
  seller: SellerPayload;
  body: IEcommerceMallSeller.IPasswordChange;
}): Promise<void> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      id: true,
      password_hash: true,
      approval_status: true,
      deleted_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Forbidden", 403);
  }
  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    seller.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.seller.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
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
// export async function putEcommerceMallSellerSellerPassword(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSeller.IPasswordChange;
// }): Promise<void> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------