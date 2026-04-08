import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomersCustomerIdPasswordResets(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IEcommerceMallCustomerPasswordReset.IResetRequest;
}): Promise<IEcommerceMallCustomerPasswordReset.IResetResponse> {
  const passwordReset =
    await MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUnique({
      where: { token: props.body.token },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        expires_at: true,
        used_at: true,
      },
    });
  if (passwordReset === null) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (passwordReset.used_at !== null) {
    throw new HttpException("Password reset token has already been used", 400);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const expiresAt = toISOStringSafe(passwordReset.expires_at);
  if (now > expiresAt) {
    throw new HttpException("Password reset token has expired", 400);
  }
  if (passwordReset.ecommerce_mall_customer_id !== props.customerId) {
    throw new HttpException(
      "Password reset token does not belong to this customer",
      400,
    );
  }
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  if (customer === null) {
    throw new HttpException("Customer not found", 404);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_customers.update({
      where: { id: props.customerId },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_customer_password_resets.update({
      where: { id: passwordReset.id },
      data: {
        used_at: new Date(),
      },
    }),
  ]);
  return {
    message: "Password reset successfully completed",
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
// import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminCustomersCustomerIdPasswordResets(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCustomerPasswordReset.IResetRequest;
// }): Promise<IEcommerceMallCustomerPasswordReset.IResetResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------