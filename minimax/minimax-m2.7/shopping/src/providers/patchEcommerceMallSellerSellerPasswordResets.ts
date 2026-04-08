import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
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

export async function patchEcommerceMallSellerSellerPasswordResets(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerPasswordReset.IRequest;
}): Promise<IEcommerceMallSellerPasswordReset.IResponse> {
  // Lookup the password reset token
  const resetRecord =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findUnique({
      where: { token: props.body.token },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        expires_at: true,
        used_at: true,
        seller: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Check if token exists
  if (resetRecord === null) {
    return {
      confirmed: false,
      message:
        "Invalid password reset token. Please request a new password reset email.",
    };
  }
  // Check if seller still exists and is not deleted
  if (resetRecord.seller.deleted_at !== null) {
    return {
      confirmed: false,
      message:
        "Unable to reset password. The seller account associated with this token no longer exists.",
    };
  }
  // Check if token has already been used
  if (resetRecord.used_at !== null) {
    return {
      confirmed: false,
      message:
        "This password reset token has already been used. Please request a new password reset email.",
    };
  }
  // Check if token has expired - expires_at <= current time
  if (resetRecord.expires_at <= new Date()) {
    return {
      confirmed: false,
      message:
        "This password reset token has expired. Please request a new password reset email.",
    };
  }
  // Token is valid - hash the new password
  const hashedPassword = await PasswordUtil.hash(props.body.newPassword);
  // Update seller's password hash
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: resetRecord.ecommerce_mall_seller_id },
    data: {
      password_hash: hashedPassword,
      updated_at: new Date(),
    },
  });
  // Mark the reset token as used
  const updatedReset =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.update({
      where: { id: resetRecord.id },
      data: {
        used_at: new Date(),
      },
      select: {
        id: true,
        used_at: true,
      },
    });
  return {
    confirmed: true,
    message:
      "Your password has been successfully reset. You can now log in with your new password.",
    reset: {
      id: updatedReset.id,
      usedAt: toISOStringSafe(updatedReset.used_at as Date),
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
// import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerPasswordResets(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerPasswordReset.IRequest;
// }): Promise<IEcommerceMallSellerPasswordReset.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------