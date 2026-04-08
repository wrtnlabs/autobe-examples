import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

type Uuid = string & tags.Format<"uuid">;
type DateTime = string & tags.Format<"date-time">;
export async function patchEcommerceMallCustomerCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerPasswordReset.IRequest;
}): Promise<void> {
  // Validate token is provided
  if (props.body.token === undefined || props.body.token === null) {
    throw new HttpException("Password reset token is required", 400);
  }
  // Find the password reset token record
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
  // Token must exist
  if (passwordReset === null) {
    throw new HttpException("Invalid password reset token", 400);
  }
  // Token must not be already used
  if (passwordReset.used_at !== null) {
    throw new HttpException("Password reset token has already been used", 400);
  }
  // Token must not be expired - compare timestamps as strings
  const now = new Date().toISOString() as DateTime;
  const expiresAt = passwordReset.expires_at.toISOString() as DateTime;
  if (expiresAt <= now) {
    throw new HttpException("Password reset token has expired", 400);
  }
  // Find and verify customer exists and is active
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: passwordReset.ecommerce_mall_customer_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (customer === null) {
    throw new HttpException(
      "Customer not found or account has been deleted",
      404,
    );
  }
  // Verify the authenticated customer matches the token's customer
  if (customer.id !== props.customer.id) {
    throw new HttpException("Token does not belong to this customer", 403);
  }
  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(props.body.newPassword);
  // Execute password update and token usage in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_customers.update({
      where: { id: customer.id },
      data: {
        password_hash: hashedPassword,
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
  // Invalidate all existing sessions for security
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.deleteMany({
    where: {
      ecommerce_mall_customer_id: customer.id,
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
// import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomerPasswordResets(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerPasswordReset.IRequest;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------